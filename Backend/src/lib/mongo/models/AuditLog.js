const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    ts: { type: String, required: true, index: true },
    actorId: { type: String, default: null, index: true },
    actorEmail: { type: String, default: null },
    action: { type: String, required: true },
    target: { type: mongoose.Schema.Types.Mixed, default: null },
    summary: { type: String, default: "" },
    changes: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { strict: false, versionKey: false }
);

module.exports =
  mongoose.models.AuditLog ||
  mongoose.model("AuditLog", auditLogSchema, "auditLogs");
