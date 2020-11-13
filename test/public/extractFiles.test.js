'use strict';

const { deepStrictEqual, strictEqual } = require('assert');
const revertableGlobals = require('revertable-globals');
const ReactNativeFile = require('../../public/ReactNativeFile');
const extractFiles = require('../../public/extractFiles');

module.exports = (tests) => {
  for (const [name, value] of [
    ['undefined', undefined],
    ['null', null],
    ['false', false],
    ['true', true],
    ['a falsy string', ''],
    ['a truthy string', 'a'],
    ['a falsy number', 0],
    ['a truthy number', 1],
    ['an empty object', {}],
    ['an empty array', []],
    ['a function', () => {}],
    ['an `Object` instance', new Object()],
    ['a `Number` instance', new Number(1)],
    ['a `Date` instance', new Date(2019, 0, 20)],
  ])
    tests.add(`\`extractFiles\` with ${name}.`, () => {
      deepStrictEqual(extractFiles(value), {
        clone: value,
        files: new Map(),
      });
      deepStrictEqual(extractFiles({ a: value }), {
        clone: { a: value },
        files: new Map(),
      });
      deepStrictEqual(extractFiles([value]), {
        clone: [value],
        files: new Map(),
      });
    });

  tests.add('`extractFiles` with a `FileList` instance.', () => {
    class File {}
    class FileList {
      constructor(files) {
        files.forEach((file, i) => {
          this[i] = file;
        });
        this.length = files.length;
      }
    }

    const revertGlobals = revertableGlobals({ File, FileList });

    try {
      const file0 = new File();
      const file1 = new File();
      const fileList = new FileList([file0, file1]);

      deepStrictEqual(extractFiles(fileList), {
        clone: [null, null],
        files: new Map([
          [file0, ['0']],
          [file1, ['1']],
        ]),
      });
    } finally {
      revertGlobals();
    }
  });

  tests.add('`extractFiles` with a `File` instance.', () => {
    class File {}

    const revertGlobals = revertableGlobals({ File });

    try {
      const file = new File();

      deepStrictEqual(extractFiles(file), {
        clone: null,
        files: new Map([[file, ['']]]),
      });
    } finally {
      revertGlobals();
    }
  });

  tests.add('`extractFiles` with a `Blob` instance.', () => {
    class Blob {}

    const revertGlobals = revertableGlobals({ Blob });

    try {
      const file = new Blob();

      deepStrictEqual(extractFiles(file), {
        clone: null,
        files: new Map([[file, ['']]]),
      });
    } finally {
      revertGlobals();
    }
  });

  tests.add('`extractFiles` with a `ReactNativeFile` instance.', () => {
    const file = new ReactNativeFile({ uri: '', name: '', type: '' });

    deepStrictEqual(extractFiles(file), {
      clone: null,
      files: new Map([[file, ['']]]),
    });
  });

  tests.add(
    '`extractFiles` with an object containing multiple references of a file.',
    () => {
      const file = new ReactNativeFile({ uri: '', name: '', type: '' });
      const input = { a: file, b: file };

      deepStrictEqual(extractFiles(input), {
        clone: { a: null, b: null },
        files: new Map([[file, ['a', 'b']]]),
      });
      strictEqual(input.a, file);
      strictEqual(input.b, file);
    }
  );

  tests.add('`extractFiles` with an object containing multiple files.', () => {
    const fileA = new ReactNativeFile({ uri: '', name: '', type: '' });
    const fileB = new ReactNativeFile({ uri: '', name: '', type: '' });
    const input = { a: fileA, b: fileB };

    deepStrictEqual(extractFiles(input), {
      clone: { a: null, b: null },
      files: new Map([
        [fileA, ['a']],
        [fileB, ['b']],
      ]),
    });
    strictEqual(input.a, fileA);
    strictEqual(input.b, fileB);
  });

  tests.add('`extractFiles` with a nested object containing a file.', () => {
    const file = new ReactNativeFile({ uri: '', name: '', type: '' });
    const input = { a: { a: file } };

    deepStrictEqual(extractFiles(input), {
      clone: { a: { a: null } },
      files: new Map([[file, ['a.a']]]),
    });
    strictEqual(input.a.a, file);
  });

  tests.add(
    '`extractFiles` with an array containing multiple references of a file.',
    () => {
      const file = new ReactNativeFile({ uri: '', name: '', type: '' });
      const input = [file, file];

      deepStrictEqual(extractFiles(input), {
        clone: [null, null],
        files: new Map([[file, ['0', '1']]]),
      });
      strictEqual(input[0], file);
      strictEqual(input[1], file);
    }
  );

  tests.add('`extractFiles` with an array containing multiple files.', () => {
    const file0 = new ReactNativeFile({ uri: '', name: '', type: '' });
    const file1 = new ReactNativeFile({ uri: '', name: '', type: '' });
    const input = [file0, file1];

    deepStrictEqual(extractFiles(input), {
      clone: [null, null],
      files: new Map([
        [file0, ['0']],
        [file1, ['1']],
      ]),
    });
    strictEqual(input[0], file0);
    strictEqual(input[1], file1);
  });

  tests.add('`extractFiles` with a nested array containing a file.', () => {
    const file = new ReactNativeFile({ uri: '', name: '', type: '' });
    const input = [[file]];
    deepStrictEqual(extractFiles(input), {
      clone: [[null]],
      files: new Map([[file, ['0.0']]]),
    });
    strictEqual(input[0][0], file);
  });

  tests.add('`extractFiles` with a second `path` parameter, file.', () => {
    const file = new ReactNativeFile({ uri: '', name: '', type: '' });

    deepStrictEqual(extractFiles(file, 'prefix'), {
      clone: null,
      files: new Map([[file, ['prefix']]]),
    });
  });

  tests.add(
    '`extractFiles` with a second `path` parameter, file nested in an object and array.',
    () => {
      const file = new ReactNativeFile({ uri: '', name: '', type: '' });

      deepStrictEqual(extractFiles({ a: [file] }, 'prefix'), {
        clone: { a: [null] },
        files: new Map([[file, ['prefix.a.0']]]),
      });
    }
  );

  tests.add(
    '`extractFiles` with a third `isExtractableFile` parameter.',
    () => {
      class CustomFile {}

      const file = new CustomFile();

      deepStrictEqual(
        extractFiles(file, '', (value) => value instanceof CustomFile),
        {
          clone: null,
          files: new Map([[file, ['']]]),
        }
      );
    }
  );

  tests.add('`extractFiles` with an object with circular references.', () => {
    const original = {};
    original.b = original;

    const clone = {};
    clone.b = clone;

    deepStrictEqual(extractFiles(original), { clone, files: new Map() });
  });

  tests.add('`extractFiles` with an array referenced multiple times.', () => {
    const file = new ReactNativeFile({ uri: '', name: '', type: '' });
    const array = [file];
    const input = {
      a: array,
      b: array,
    };

    const result = extractFiles(input);

    deepStrictEqual(result, {
      clone: {
        a: [null],
        b: [null],
      },
      files: new Map([[file, ['a.0', 'b.0']]]),
    });
    // strictEqual(result.clone.a, result.clone.b);
    strictEqual(array[0], file);
    strictEqual(input.a, array);
    strictEqual(input.b, array);
  });
};
