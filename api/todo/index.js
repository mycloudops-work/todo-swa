// api/todos/index.js
const { TableClient } = require("@azure/data-tables");
const { v4: uuid } = require("uuid");

function getUser(context) {
  // SWA injects x-ms-client-principal (base64 JSON)
  const header = context.req.headers["x-ms-client-principal"];
  if (!header) return null;
  const json = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  // oid claim is stable user objectId
  const oid = json?.userId || json?.claims?.find(c => c.typ?.endsWith("/oid"))?.val;
  return { oid, name: json?.name, identityProvider: json?.identityProvider };
}

function tableClient() {
  const accountUrl = process.env.TABLE_ACCOUNT_URL; // e.g., https://<acct>.table.core.windows.net
  const tableName = process.env.TABLE_NAME || "Todos";
  const sas = process.env.TABLE_SAS; // starts with ?
  return TableClient.fromUrl(`${accountUrl}/${tableName}${sas}`);
}

async function listTodos(client, ownerId) {
  const entities = client.listEntities({ queryOptions: { filter: `PartitionKey eq '${ownerId}'` } });
  const out = [];
  for await (const e of entities) out.push(e);
  return out.map(e => ({
    id: e.rowKey,
    task: e.task,
    important: e.important,
    urgency: e.urgency,
    priority: e.priority,
    effort: e.effort,
    project: e.project,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    etag: e.etag
  }));
}

module.exports = async function (context, req) {
  const user = getUser(context);
  if (!user?.oid) {
    context.res = { status: 401, body: "Unauthorized" };
    return;
  }
  const client = tableClient();

  const method = req.method.toUpperCase();
  try {
    if (method === "GET") {
      const data = await listTodos(client, user.oid);
      context.res = { status: 200, body: data };
    } else if (method === "POST") {
      const body = req.body || {};
      const now = new Date().toISOString();
      const id = body.id || uuid();
      const entity = {
        partitionKey: user.oid,
        rowKey: id,
        task: body.task,
        important: body.important,  // "PI" | "NI"
        urgency: body.urgency,      // "PU" | "NU"
        priority: Number(body.priority),
        effort: body.effort,        // e.g., "4h"
        project: body.project,
        createdAt: now,
        updatedAt: now
      };
      await client.createEntity(entity);
      context.res = { status: 201, body: { id } };
    } else if (method === "PUT") {
      const body = req.body || {};
      if (!body.id) throw new Error("id required");
      const now = new Date().toISOString();
      const entity = {
        partitionKey: user.oid,
        rowKey: body.id,
        task: body.task,
        important: body.important,
        urgency: body.urgency,
        priority: Number(body.priority),
        effort: body.effort,
        project: body.project,
        createdAt: body.createdAt,
        updatedAt: now,
        etag: body.etag || "*"
      };
      await client.updateEntity(entity, "Merge"); // optimistic with ETag if provided
      context.res = { status: 200, body: { ok: true } };
    } else if (method === "DELETE") {
      const id = (req.query.id || (req.body && req.body.id));
      if (!id) throw new Error("id required");
      await client.deleteEntity(user.oid, id);
      context.res = { status: 200, body: { ok: true } };
    } else {
      context.res = { status: 405, body: "Method Not Allowed" };
    }
  } catch (e) {
    context.log.error(e);
    context.res = { status: 500, body: e.message || "Server error" };
  }
};
