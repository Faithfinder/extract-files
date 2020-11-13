'use strict';

const defaultIsExtractableFile = require('./isExtractableFile');

/**
 * Clones a value, recursively extracting
 * [`File`](https://developer.mozilla.org/docs/web/api/file),
 * [`Blob`](https://developer.mozilla.org/docs/web/api/blob) and
 * [`ReactNativeFile`]{@link ReactNativeFile} instances with their
 * [object paths]{@link ObjectPath}, replacing them with `null`.
 * [`FileList`](https://developer.mozilla.org/docs/web/api/filelist) instances
 * are treated as [`File`](https://developer.mozilla.org/docs/web/api/file)
 * instance arrays.
 * @kind function
 * @name extractFiles
 * @param {*} value Value (typically an object tree) to extract files from.
 * @param {ObjectPath} [path=''] Prefix for object paths for extracted files.
 * @param {ExtractableFileMatcher} [isExtractableFile=isExtractableFile] The function used to identify extractable files.
 * @returns {ExtractFilesResult} Result.
 * @example <caption>Ways to `import`.</caption>
 * ```js
 * import { extractFiles } from 'extract-files';
 * ```
 *
 * ```js
 * import extractFiles from 'extract-files/public/extractFiles.js';
 * ```
 * @example <caption>Ways to `require`.</caption>
 * ```js
 * const { extractFiles } = require('extract-files');
 * ```
 *
 * ```js
 * const extractFiles = require('extract-files/public/extractFiles');
 * ```
 * @example <caption>Extract files from an object.</caption>
 * For the following:
 *
 * ```js
 * import { extractFiles } from 'extract-files';
 *
 * const file1 = new File(['1'], '1.txt', { type: 'text/plain' });
 * const file2 = new File(['2'], '2.txt', { type: 'text/plain' });
 * const value = {
 *   a: file1,
 *   b: [file1, file2],
 * };
 *
 * const { clone, files } = extractFiles(value, 'prefix');
 * ```
 *
 * `value` remains the same.
 *
 * `clone` is:
 *
 * ```json
 * {
 *   "a": null,
 *   "b": [null, null]
 * }
 * ```
 *
 * `files` is a [`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map) instance containing:
 *
 * | Key     | Value                        |
 * | :------ | :--------------------------- |
 * | `file1` | `['prefix.a', 'prefix.b.0']` |
 * | `file2` | `['prefix.b.1']`             |
 */
module.exports = function extractFiles(
  value,
  path = '',
  isExtractableFile = defaultIsExtractableFile
) {
  // Holds files that get extracted from the value.
  const files = new Map();

  /**
   * Adds a file to the extracted files map.
   * @kind function
   * @name extractFiles~addFile
   * @param {ExtractableFile} file Extracted file.
   * @param {ObjectPath} path File object path.
   * @ignore
   */
  function addFile(file, path) {
    const storedPaths = files.get(file);
    if (storedPaths) storedPaths.push(path);
    else files.set(file, [path]);
  }

  /**
   * Recursively clones the value, extracting files.
   * @kind function
   * @name extractFiles~recurse
   * @param {*} value Value to extract files from.
   * @param {ObjectPath} path Prefix for object paths for extracted files.
   * @param {Set} [recursed] Holds arrays and objects from the value that get recursed, so infinite recursion of circular references can be avoided.
   * @returns {*} Clone of the value with files replaced with `null`.
   * @ignore
   */
  function recurse(value, path, recursed) {
    if (isExtractableFile(value)) {
      addFile(value, path);
      return null;
    }

    const prefix = path ? `${path}.` : '';

    // It is safe to assume that a `FileList` instance only contains `File`
    // instances, and doesn’t contain circular references.
    if (typeof FileList !== 'undefined' && value instanceof FileList)
      return Array.prototype.map.call(value, (item, index) =>
        recurse(item, `${prefix}${index}`)
      );

    if (Array.isArray(value) && !recursed.has(value))
      return value.map((item, index) =>
        recurse(item, `${prefix}${index}`, new Set(recursed).add(value))
      );

    if (value && value.constructor === Object && !recursed.has(value)) {
      const clone = {};
      for (const key in value)
        clone[key] = recurse(
          value[key],
          `${prefix}${key}`,
          new Set(recursed).add(value)
        );
      return clone;
    }

    return value;
  }

  return {
    clone: recurse(value, path, new Set()),
    files,
  };
};
