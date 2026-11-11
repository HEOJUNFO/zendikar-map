// Where the Tripo Studio workflow library lives, and how to rebuild it.
// The library is upstream tripo-studio-mcp at a pinned commit plus library.patch
// (cookie-session mode `provided_session` + `tripo_set_session`, POSIX snapshot fix).
// It stays out of git under build/; `node scripts/tripo-studio/setup-library.mjs` recreates it.
import {fileURLToPath,pathToFileURL} from 'node:url'
import {join,resolve} from 'node:path'

export const root=fileURLToPath(new URL('../../',import.meta.url))
export const UPSTREAM='https://github.com/Ador-able/tripo-studio-mcp'
export const UPSTREAM_COMMIT='45df024ff8196ddd3f9226a082b87ce5b4c459c2'
export const PATCH=fileURLToPath(new URL('library.patch',import.meta.url))
export const SOURCE_DIR=join(root,'build/tripo-studio-mcp-src')
export const LIBRARY_DIR=resolve(process.env.TRIPO_LIBRARY_DIR||join(SOURCE_DIR,'dist'))
export const libraryUrl=file=>new URL(file,pathToFileURL(LIBRARY_DIR+'/'))
