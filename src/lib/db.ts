import { randomBytes, randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import mysql, { type Pool, type PoolConnection, type RowDataPacket } from "mysql2/promise";
import type {
  AccessLog,
  Database,
  FeedbackAttachment,
  FeedbackItem,
  Material,
  Order,
  OrderBundle,
  ProgressEntry
} from "@/src/lib/types";
import { makeOrderCode, sortNewestFirst } from "@/src/lib/format";

const uploadsDir = path.join(process.cwd(), "storage", "uploads");
const legacyJsonPath = path.join(process.cwd(), "storage", "data", "db.json");

let pool: Pool | null = null;
let initialized = false;

export function nowIso() {
  return new Date().toISOString();
}

export function newId() {
  return randomUUID();
}

export function newShareToken() {
  return randomBytes(24).toString("base64url");
}

export async function readDatabase(): Promise<Database> {
  const db = await getPool();
  const [orders] = await db.query<RowDataPacket[]>(
    "select * from orders order by updatedAt desc"
  );
  const [materials] = await db.query<RowDataPacket[]>(
    "select * from materials order by createdAt desc"
  );
  const [progressEntries] = await db.query<RowDataPacket[]>(
    "select * from progress_entries order by createdAt desc"
  );
  const [feedbackItems] = await db.query<RowDataPacket[]>(
    "select * from feedback_items order by updatedAt desc"
  );
  const [feedbackAttachments] = await db.query<RowDataPacket[]>(
    "select * from feedback_attachments order by createdAt desc"
  );
  const [accessLogs] = await db.query<RowDataPacket[]>(
    "select * from access_logs order by createdAt desc limit 500"
  );

  return {
    orders: orders.map(rowToOrder),
    materials: materials.map(rowToMaterial),
    progressEntries: progressEntries.map(rowToProgressEntry),
    feedbackItems: feedbackItems.map(rowToFeedbackItem),
    feedbackAttachments: feedbackAttachments.map(rowToFeedbackAttachment),
    accessLogs: accessLogs.map(rowToAccessLog)
  };
}

export async function writeDatabase(database: Database) {
  const db = await getPool();
  await writeSnapshotWithPool(db, database);
}

export async function mutateDatabase<T>(
  mutator: (database: Database) => T | Promise<T>
) {
  const database = await readDatabase();
  const result = await mutator(database);
  await writeDatabase(database);
  return result;
}

export async function getOrderBundle(orderId: string): Promise<OrderBundle | null> {
  const database = await readDatabase();
  const order = database.orders.find((item) => item.id === orderId);
  if (!order) return null;
  return buildOrderBundle(database, order);
}

export async function getOrderBundleByToken(
  token: string
): Promise<OrderBundle | null> {
  const database = await readDatabase();
  const order = database.orders.find((item) => item.shareToken === token);
  if (!order || !isShareOrderAccessible(order)) return null;
  return buildOrderBundle(database, order);
}

export function isShareOrderAccessible(order: Order) {
  if (!order.shareEnabled || order.status === "archived") return false;
  if (!order.shareExpiresAt) return true;
  return new Date(order.shareExpiresAt).getTime() > Date.now();
}

export function buildOrderBundle(
  database: Database,
  order: Order
): OrderBundle {
  const feedbackItems = sortNewestFirst(
    database.feedbackItems.filter((item) => item.orderId === order.id)
  );
  const feedbackIds = new Set(feedbackItems.map((item) => item.id));

  return {
    order,
    materials: sortNewestFirst(
      database.materials.filter((item) => item.orderId === order.id)
    ),
    progressEntries: sortNewestFirst(
      database.progressEntries.filter((item) => item.orderId === order.id)
    ),
    feedbackItems,
    feedbackAttachments: sortNewestFirst(
      database.feedbackAttachments.filter((item) =>
        feedbackIds.has(item.feedbackId)
      )
    ),
    accessLogs: sortNewestFirst(
      database.accessLogs.filter((item) => item.orderId === order.id)
    )
  };
}

export async function recordAccessLog(log: Omit<AccessLog, "id" | "createdAt">) {
  try {
    const db = await getPool();
    await db.execute(
      `insert into access_logs
       (id, orderId, type, materialId, userAgent, ip, createdAt)
       values (?, ?, ?, ?, ?, ?, ?)`,
      [
        newId(),
        log.orderId,
        log.type,
        log.materialId || null,
        log.userAgent || null,
        log.ip || null,
        nowIso()
      ]
    );
    await db.execute(
      `delete from access_logs
       where id not in (select id from (select id from access_logs order by createdAt desc limit 500) recent)`
    );
  } catch (error) {
    console.error("Failed to record access log", error);
  }
}

export function getLatestProgramVersions(materials: Material[]) {
  return materials
    .filter((item) => item.category === "program")
    .filter((item) => item.visible)
    .sort((a, b) => {
      if (a.isLatest && !b.isLatest) return -1;
      if (!a.isLatest && b.isLatest) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

async function getPool() {
  if (!pool) {
    await ensureMysqlDatabaseExists();
    pool = mysql.createPool({
      uri: getDatabaseUrl(),
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
      queueLimit: 0,
      timezone: "Z",
      dateStrings: true
    });
  }

  if (!initialized) {
    await initializeDatabase(pool);
    initialized = true;
  }

  return pool;
}

function getDatabaseUrl() {
  const mysqlUrl = process.env.MYSQL_URL;
  if (mysqlUrl) return mysqlUrl;

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl?.startsWith("mysql://") || databaseUrl?.startsWith("mysql2://")) {
    return databaseUrl;
  }

  return "mysql://root:password@localhost:3306/graduation_delivery";
}

async function ensureMysqlDatabaseExists() {
  const url = new URL(getDatabaseUrl());
  const databaseName = url.pathname.replace(/^\//, "");
  if (!databaseName) return;

  const connection = await mysql.createConnection({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    timezone: "Z"
  });

  try {
    await connection.query(
      `create database if not exists ${escapeIdentifier(databaseName)}
       default character set utf8mb4
       default collate utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
}

function escapeIdentifier(identifier: string) {
  return `\`${identifier.replace(/`/g, "``")}\``;
}

async function initializeDatabase(db: Pool) {
  mkdirSync(uploadsDir, { recursive: true });
  await createSchema(db);

  const [rows] = await db.query<RowDataPacket[]>(
    "select count(*) as count from orders"
  );
  const count = Number(rows[0]?.count || 0);
  if (count > 0) return;

  if (existsSync(legacyJsonPath)) {
    const legacy = JSON.parse(readFileSync(legacyJsonPath, "utf8")) as Database;
    await writeSnapshotWithPool(db, legacy);
    return;
  }

  writeSeedFiles();
  await writeSnapshotWithPool(db, createSeedDatabase());
}

async function createSchema(db: Pool) {
  const statements = [
    `create table if not exists orders (
      id varchar(64) primary key,
      customerName varchar(120) not null,
      projectTitle varchar(255) not null,
      orderCode varchar(64) not null,
      status varchar(40) not null,
      progress int not null,
      dueDate varchar(32) not null,
      shareToken varchar(128) not null unique,
      shareEnabled tinyint(1) not null,
      shareExpiresAt varchar(32) null,
      customerNote text null,
      adminNote text null,
      createdAt varchar(40) not null,
      updatedAt varchar(40) not null
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci`,
    `create table if not exists materials (
      id varchar(64) primary key,
      orderId varchar(64) not null,
      category varchar(40) not null,
      title varchar(255) not null,
      description text null,
      originalName varchar(255) not null,
      storedName varchar(255) not null,
      mimeType varchar(120) not null,
      size bigint not null,
      visible tinyint(1) not null,
      version varchar(40) null,
      releaseNotes text null,
      isLatest tinyint(1) not null,
      createdAt varchar(40) not null,
      updatedAt varchar(40) not null,
      index idx_materials_order (orderId),
      constraint fk_materials_order foreign key (orderId) references orders(id) on delete cascade
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci`,
    `create table if not exists progress_entries (
      id varchar(64) primary key,
      orderId varchar(64) not null,
      title varchar(255) not null,
      content text not null,
      stage varchar(80) not null,
      visibleToCustomer tinyint(1) not null,
      createdAt varchar(40) not null,
      index idx_progress_order (orderId),
      constraint fk_progress_order foreign key (orderId) references orders(id) on delete cascade
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci`,
    `create table if not exists feedback_items (
      id varchar(64) primary key,
      orderId varchar(64) not null,
      title varchar(255) not null,
      description text not null,
      severity varchar(40) not null,
      status varchar(40) not null,
      adminReply text null,
      fixedVersion varchar(40) null,
      createdAt varchar(40) not null,
      updatedAt varchar(40) not null,
      index idx_feedback_order (orderId),
      constraint fk_feedback_order foreign key (orderId) references orders(id) on delete cascade
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci`,
    `create table if not exists feedback_attachments (
      id varchar(64) primary key,
      feedbackId varchar(64) not null,
      originalName varchar(255) not null,
      storedName varchar(255) not null,
      mimeType varchar(120) not null,
      size bigint not null,
      createdAt varchar(40) not null,
      index idx_attachment_feedback (feedbackId),
      constraint fk_attachment_feedback foreign key (feedbackId) references feedback_items(id) on delete cascade
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci`,
    `create table if not exists access_logs (
      id varchar(64) primary key,
      orderId varchar(64) not null,
      type varchar(40) not null,
      materialId varchar(64) null,
      userAgent text null,
      ip varchar(255) null,
      createdAt varchar(40) not null,
      index idx_access_order (orderId),
      constraint fk_access_order foreign key (orderId) references orders(id) on delete cascade
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci`
  ];

  for (const statement of statements) {
    await db.execute(statement);
  }
}

async function writeSnapshotWithPool(db: Pool, database: Database) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("delete from access_logs");
    await connection.execute("delete from feedback_attachments");
    await connection.execute("delete from feedback_items");
    await connection.execute("delete from progress_entries");
    await connection.execute("delete from materials");
    await connection.execute("delete from orders");

    for (const item of database.orders) await insertOrder(connection, item);
    for (const item of database.materials) await insertMaterial(connection, item);
    for (const item of database.progressEntries) {
      await insertProgressEntry(connection, item);
    }
    for (const item of database.feedbackItems) {
      await insertFeedbackItem(connection, item);
    }
    for (const item of database.feedbackAttachments) {
      await insertFeedbackAttachment(connection, item);
    }
    for (const item of database.accessLogs) await insertAccessLog(connection, item);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function insertOrder(connection: PoolConnection, item: Order) {
  await connection.execute(
    `insert into orders
     (id, customerName, projectTitle, orderCode, status, progress, dueDate, shareToken,
      shareEnabled, shareExpiresAt, customerNote, adminNote, createdAt, updatedAt)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.customerName,
      item.projectTitle,
      item.orderCode,
      item.status,
      item.progress,
      item.dueDate,
      item.shareToken,
      item.shareEnabled ? 1 : 0,
      item.shareExpiresAt || null,
      item.customerNote || null,
      item.adminNote || null,
      item.createdAt,
      item.updatedAt
    ]
  );
}

async function insertMaterial(connection: PoolConnection, item: Material) {
  await connection.execute(
    `insert into materials
     (id, orderId, category, title, description, originalName, storedName, mimeType, size,
      visible, version, releaseNotes, isLatest, createdAt, updatedAt)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.orderId,
      item.category,
      item.title,
      item.description || null,
      item.originalName,
      item.storedName,
      item.mimeType,
      item.size,
      item.visible ? 1 : 0,
      item.version || null,
      item.releaseNotes || null,
      item.isLatest ? 1 : 0,
      item.createdAt,
      item.updatedAt
    ]
  );
}

async function insertProgressEntry(
  connection: PoolConnection,
  item: ProgressEntry
) {
  await connection.execute(
    `insert into progress_entries
     (id, orderId, title, content, stage, visibleToCustomer, createdAt)
     values (?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.orderId,
      item.title,
      item.content,
      item.stage,
      item.visibleToCustomer ? 1 : 0,
      item.createdAt
    ]
  );
}

async function insertFeedbackItem(connection: PoolConnection, item: FeedbackItem) {
  await connection.execute(
    `insert into feedback_items
     (id, orderId, title, description, severity, status, adminReply, fixedVersion, createdAt, updatedAt)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.orderId,
      item.title,
      item.description,
      item.severity,
      item.status,
      item.adminReply || null,
      item.fixedVersion || null,
      item.createdAt,
      item.updatedAt
    ]
  );
}

async function insertFeedbackAttachment(
  connection: PoolConnection,
  item: FeedbackAttachment
) {
  await connection.execute(
    `insert into feedback_attachments
     (id, feedbackId, originalName, storedName, mimeType, size, createdAt)
     values (?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.feedbackId,
      item.originalName,
      item.storedName,
      item.mimeType,
      item.size,
      item.createdAt
    ]
  );
}

async function insertAccessLog(connection: PoolConnection, item: AccessLog) {
  await connection.execute(
    `insert into access_logs
     (id, orderId, type, materialId, userAgent, ip, createdAt)
     values (?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.orderId,
      item.type,
      item.materialId || null,
      item.userAgent || null,
      item.ip || null,
      item.createdAt
    ]
  );
}

function writeSeedFiles() {
  mkdirSync(uploadsDir, { recursive: true });
  writeFileSync(
    path.join(uploadsDir, "seed-thesis-outline.txt"),
    "客户上线清单、验收步骤与交付说明示例。\n",
    "utf8"
  );
  writeFileSync(
    path.join(uploadsDir, "seed-program-v001.txt"),
    "版本 v1.0.0：开放客户门户、资料下载和反馈入口。\n",
    "utf8"
  );
  writeFileSync(
    path.join(uploadsDir, "seed-program-v002.txt"),
    "版本 v1.1.0：优化移动端体验，补充版本说明与反馈状态。\n",
    "utf8"
  );
  writeFileSync(
    path.join(uploadsDir, "seed-other-readme.txt"),
    "部署说明、账号分配与运行命令示例。\n",
    "utf8"
  );
}

function createSeedDatabase(): Database {
  const createdAt = nowIso();
  const orderId = newId();
  const feedbackId = newId();

  return {
    orders: [
      {
        id: orderId,
        customerName: "华南区域运营团队",
        projectTitle: "客户交付协作平台升级项目",
        orderCode: makeOrderCode(),
        status: "in_progress",
        progress: 72,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12)
          .toISOString()
          .slice(0, 10),
        shareToken: newShareToken(),
        shareEnabled: true,
        customerNote: "请优先下载当前推荐版本，完成关键流程验证后再反馈结果。",
        adminNote: "示例项目，重点展示版本交付、客户反馈和处理闭环。",
        createdAt,
        updatedAt: createdAt
      }
    ],
    materials: [
      {
        id: newId(),
        orderId,
        category: "thesis",
        title: "上线验收清单",
        description: "包含验收范围、关键流程与交付注意事项。",
        originalName: "上线验收清单.txt",
        storedName: "seed-thesis-outline.txt",
        mimeType: "text/plain",
        size: 53,
        visible: true,
        isLatest: false,
        createdAt,
        updatedAt: createdAt
      },
      {
        id: newId(),
        orderId,
        category: "program",
        title: "客户门户交付包",
        description: "首个可运行交付版本。",
        originalName: "portal-release-v1.0.0.txt",
        storedName: "seed-program-v001.txt",
        mimeType: "text/plain",
        size: 71,
        visible: true,
        version: "v1.0.0",
        releaseNotes: "开放客户门户、资料下载区和基础反馈入口。",
        isLatest: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        updatedAt: createdAt
      },
      {
        id: newId(),
        orderId,
        category: "program",
        title: "客户门户交付包",
        description: "当前推荐下载版本。",
        originalName: "portal-release-v1.1.0.txt",
        storedName: "seed-program-v002.txt",
        mimeType: "text/plain",
        size: 79,
        visible: true,
        version: "v1.1.0",
        releaseNotes: "优化移动端体验，补充版本说明，并强化反馈状态展示。",
        isLatest: true,
        createdAt,
        updatedAt: createdAt
      },
      {
        id: newId(),
        orderId,
        category: "other",
        title: "部署与账号说明",
        description: "包含环境变量、账号分配与运行命令说明。",
        originalName: "部署与账号说明.txt",
        storedName: "seed-other-readme.txt",
        mimeType: "text/plain",
        size: 52,
        visible: true,
        isLatest: false,
        createdAt,
        updatedAt: createdAt
      }
    ],
    progressEntries: [
      {
        id: newId(),
        orderId,
        title: "版本 v1.1.0 已发布",
        content: "已补充推荐版本说明、反馈状态展示，并优化移动端客户门户体验。",
        stage: "版本更新",
        visibleToCustomer: true,
        createdAt
      },
      {
        id: newId(),
        orderId,
        title: "验收资料已整理",
        content: "验收清单、部署说明和交付流程已经整理完成，可供客户逐项核验。",
        stage: "交付准备",
        visibleToCustomer: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString()
      }
    ],
    feedbackItems: [
      {
        id: feedbackId,
        orderId,
        title: "移动端材料列表间距偏挤",
        description: "手机上打开时，程序版本列表的按钮比较靠近。",
        severity: "medium",
        status: "fixed",
        adminReply: "已在 v1.1.0 中调整移动端间距，建议重新验证下载流程。",
        fixedVersion: "v1.1.0",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
        updatedAt: createdAt
      }
    ],
    feedbackAttachments: [],
    accessLogs: []
  };
}

function rowToOrder(row: RowDataPacket): Order {
  return {
    id: String(row.id),
    customerName: String(row.customerName),
    projectTitle: String(row.projectTitle),
    orderCode: String(row.orderCode),
    status: row.status as Order["status"],
    progress: Number(row.progress),
    dueDate: String(row.dueDate),
    shareToken: String(row.shareToken),
    shareEnabled: Boolean(row.shareEnabled),
    shareExpiresAt: optionalString(row.shareExpiresAt),
    customerNote: optionalString(row.customerNote),
    adminNote: optionalString(row.adminNote),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt)
  };
}

function rowToMaterial(row: RowDataPacket): Material {
  return {
    id: String(row.id),
    orderId: String(row.orderId),
    category: row.category as Material["category"],
    title: String(row.title),
    description: optionalString(row.description),
    originalName: String(row.originalName),
    storedName: String(row.storedName),
    mimeType: String(row.mimeType),
    size: Number(row.size),
    visible: Boolean(row.visible),
    version: optionalString(row.version),
    releaseNotes: optionalString(row.releaseNotes),
    isLatest: Boolean(row.isLatest),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt)
  };
}

function rowToProgressEntry(row: RowDataPacket): ProgressEntry {
  return {
    id: String(row.id),
    orderId: String(row.orderId),
    title: String(row.title),
    content: String(row.content),
    stage: String(row.stage),
    visibleToCustomer: Boolean(row.visibleToCustomer),
    createdAt: String(row.createdAt)
  };
}

function rowToFeedbackItem(row: RowDataPacket): FeedbackItem {
  return {
    id: String(row.id),
    orderId: String(row.orderId),
    title: String(row.title),
    description: String(row.description),
    severity: row.severity as FeedbackItem["severity"],
    status: row.status as FeedbackItem["status"],
    adminReply: optionalString(row.adminReply),
    fixedVersion: optionalString(row.fixedVersion),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt)
  };
}

function rowToFeedbackAttachment(row: RowDataPacket): FeedbackAttachment {
  return {
    id: String(row.id),
    feedbackId: String(row.feedbackId),
    originalName: String(row.originalName),
    storedName: String(row.storedName),
    mimeType: String(row.mimeType),
    size: Number(row.size),
    createdAt: String(row.createdAt)
  };
}

function rowToAccessLog(row: RowDataPacket): AccessLog {
  return {
    id: String(row.id),
    orderId: String(row.orderId),
    type: row.type as AccessLog["type"],
    materialId: optionalString(row.materialId),
    userAgent: optionalString(row.userAgent),
    ip: optionalString(row.ip),
    createdAt: String(row.createdAt)
  };
}

function optionalString(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  return String(value);
}
