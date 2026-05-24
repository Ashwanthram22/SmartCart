/**
 * Helpers to move between Mongoose documents and the legacy `db.json` shape.
 */

function toPlain(doc) {
  if (doc == null) return doc;
  if (Array.isArray(doc)) return doc.map(toPlain);
  const raw =
    typeof doc.toObject === "function"
      ? doc.toObject({ virtuals: false, getters: false })
      : { ...doc };
  delete raw._id;
  delete raw.__v;
  return raw;
}

/**
 * Upsert every row by a stable business key (`id` or `code`).
 */
async function syncByKey(Model, items, keyField = "id") {
  const list = Array.isArray(items) ? items : [];
  const keys = list
    .map((row) => row?.[keyField])
    .filter((k) => k != null && String(k).length > 0);

  if (keys.length > 0) {
    await Model.deleteMany({ [keyField]: { $nin: keys } });
  } else {
    await Model.deleteMany({});
  }

  if (list.length === 0) return;

  const ops = list.map((row) => {
    const replacement = { ...row };
    delete replacement._id;
    return {
      replaceOne: {
        filter: { [keyField]: replacement[keyField] },
        replacement,
        upsert: true,
      },
    };
  });

  await Model.bulkWrite(ops, { ordered: false });
}

module.exports = { toPlain, syncByKey };
