let pdfMakePromise = null;

/**
 * Lazy-load pdfmake and register Roboto VFS fonts once.
 * Uses the raw `vfs_fonts.js` source to avoid CJS/ESM interop edge-cases.
 */
export function loadPdfMake() {
  if (pdfMakePromise) return pdfMakePromise;
  pdfMakePromise = (async () => {
    const pdfModule = await import("pdfmake/build/pdfmake");
    const pdfMake = pdfModule.default || pdfModule;
    if (typeof pdfMake.addVirtualFileSystem !== "function") {
      throw new Error("pdfmake did not expose addVirtualFileSystem().");
    }

    const vfsRawModule = await import("pdfmake/build/vfs_fonts.js?raw");
    const vfsSource = vfsRawModule.default || vfsRawModule;
    if (typeof vfsSource !== "string" || vfsSource.length < 1024) {
      throw new Error("Could not load pdfmake VFS fonts.");
    }

    const fakeModule = { exports: {} };
    const fakeGlobal = {};
    // eslint-disable-next-line no-new-func
    const evaluate = new Function(
      "module",
      "exports",
      "window",
      "self",
      "global",
      "globalThis",
      vfsSource
    );
    evaluate(
      fakeModule,
      fakeModule.exports,
      fakeGlobal,
      fakeGlobal,
      fakeGlobal,
      fakeGlobal
    );
    const vfs = fakeModule.exports;
    if (!vfs || typeof vfs !== "object" || typeof vfs["Roboto-Medium.ttf"] !== "string") {
      throw new Error("pdfmake VFS fonts are missing Roboto-Medium.ttf.");
    }

    pdfMake.addVirtualFileSystem(vfs);
    const ok =
      pdfMake.virtualfs &&
      typeof pdfMake.virtualfs.existsSync === "function" &&
      pdfMake.virtualfs.existsSync("Roboto-Medium.ttf");
    if (!ok) {
      throw new Error("pdfmake virtual fs does not contain registered fonts.");
    }
    return pdfMake;
  })();

  pdfMakePromise.catch(() => {
    pdfMakePromise = null;
  });
  return pdfMakePromise;
}

export async function downloadPdfDefinition(definition, filename) {
  const pdfMake = await loadPdfMake();
  await pdfMake.createPdf(definition).download(filename);
}

