"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);
var import_pluginutils = require("@rollup/pluginutils");

// src/utils.ts
var import_process = require("process");
var import_path = require("path");
var import_fs_extra = __toESM(require("fs-extra"));
var import_picocolors = __toESM(require("picocolors"));
var { existsSync, readdirSync } = import_fs_extra.default;
function toArray(array) {
  array = array || [];
  if (Array.isArray(array))
    return array;
  return [array];
}
function getComponentPath(id, componentPath) {
  if (!(0, import_path.isAbsolute)(componentPath))
    componentPath = (0, import_path.resolve)((0, import_process.cwd)(), componentPath);
  const t = (0, import_path.relative)((0, import_path.dirname)(id), componentPath).replaceAll(/\\/g, "/");
  return t.startsWith(".") ? t : `./${t}`;
}
var attribs = Object.entries(
  {
    class: "className",
    tabindex: "tabIndex"
  }
);
function transformAttribs(elementAttribs) {
  if (elementAttribs) {
    attribs.forEach((attrib) => {
      const [name, replaceName] = attrib;
      if (elementAttribs[name]) {
        elementAttribs[replaceName] = elementAttribs[name];
        delete elementAttribs[name];
      }
    });
  }
}
var DEFAULT_IMPORT_PATH = "./src/components/pages";
function getDefaultImportCom(importComs) {
  const defaultPath = (0, import_path.resolve)((0, import_process.cwd)(), DEFAULT_IMPORT_PATH);
  const res = {};
  if (!existsSync(defaultPath) && !!importComs) {
    const componentsNames = importComs.join(" ");
    console.log(
      import_picocolors.default.yellow(`
        \u26A0\uFE0F the md file had undefined component name \`${import_picocolors.default.bold(componentsNames)}\`
        No default import component path found, please set it manually.
      `)
    );
    return res;
  }
  readdirSync(defaultPath, "utf-8").forEach((comName) => {
    if (comName.endsWith(".tsx")) {
      const name = comName.replace(".tsx", "");
      res[name.replace(/^\S/, (s) => s.toUpperCase())] = `${DEFAULT_IMPORT_PATH}/${name}`;
    }
  });
  return res;
}

// src/options.ts
function resloveOptions(userOptions) {
  const defaultOptions = {
    // frontmatter: true,
    markdownItOptions: {},
    markdownItUses: [],
    markdownItSetup: () => {
    },
    importComponentsPath: {},
    wrapperComponentPath: "",
    transforms: {},
    wrapperClasses: "markdown-body",
    wrapperComponentName: null,
    include: null,
    exclude: null
  };
  const options = {
    ...defaultOptions,
    ...userOptions
  };
  options.wrapperClasses = toArray(options.wrapperClasses).filter((i) => i).join(" ");
  return options;
}

// src/markdown.ts
var import_markdown_it = __toESM(require("markdown-it"));
var import_htmlparser2 = require("htmlparser2");
var import_dom_serializer = __toESM(require("dom-serializer"));
var import_front_matter = __toESM(require("front-matter"));
var import_core = require("@babel/core");
var import_plugin_component = require("@mdit-vue/plugin-component");
var import_domhandler = require("domhandler");
var IMPORT_COM_REG = /<\s*?([A-Z][^</>\s]*)\s*?\/?>/g;
function extractEscapeToReact(html) {
  return html.replace(/vfmbracket;/g, '{"\\u007b"}').replace(/&#x2018;/g, '"').replace(/&#x2019;/g, '"').replace(/&#x201c;/g, '"').replace(/&#x201d;/g, '"').replace(/"vfm{{/g, "{{").replace(/}}vfm"/g, "}}").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/<!--/g, "{/*").replace(/-->/g, "*/}").replace(/vfmless;/g, "&lt;");
}
function getImportComInMarkdown(html, wrapperComponentName) {
  const whiteList = ["React.Fragment", "React__Markdown"];
  wrapperComponentName && whiteList.push(wrapperComponentName);
  const importComs = [];
  let match;
  while (match !== null) {
    match = IMPORT_COM_REG.exec(html);
    if (match && !importComs.includes(match[1]) && !whiteList.includes(match[1]))
      importComs.push(match[1]);
  }
  return {
    importComs,
    html
  };
}
function createMarkdown(options) {
  const markdown = new import_markdown_it.default({
    html: true,
    linkify: true,
    typographer: true,
    xhtmlOut: true,
    ...options.markdownItOptions
  });
  markdown.use(import_plugin_component.componentPlugin);
  markdown.linkify.set({ fuzzyLink: false });
  options.markdownItUses.forEach((e) => {
    const [plugin, options2] = toArray(e);
    markdown.use(plugin, options2);
  });
  options.markdownItSetup(markdown);
  return (id, raw) => {
    const {
      wrapperClasses,
      wrapperComponentName,
      wrapperComponentPath,
      importComponentsPath,
      transforms
    } = options;
    raw = raw.trimStart();
    const { body, attributes } = (0, import_front_matter.default)(raw);
    const attributesString = JSON.stringify(attributes);
    if (transforms.before)
      raw = transforms.before(raw, id);
    const env = { id };
    let html = markdown.render(body, env);
    const { importComs } = getImportComInMarkdown(html, wrapperComponentName);
    html = html.replace(/&lt;/g, "vfmless;").replace(/{/g, "vfmbracket;");
    const root = (0, import_htmlparser2.parseDocument)(html, { lowerCaseTags: false });
    if (root.children.length) {
      Array.from(root.children).forEach((e) => {
        markCodeAsPre(e);
      });
    }
    const h = (0, import_dom_serializer.default)(root, {
      selfClosingTags: true,
      decodeEntities: false
    });
    html = extractEscapeToReact(h);
    if (wrapperClasses) {
      html = `<div className="${wrapperClasses}">
          <React.Fragment>
            ${html}
          </React.Fragment> 
        </div>`;
    } else {
      html = `<div>${html}</div>`;
    }
    let wrapperComponentImp = "";
    if (wrapperComponentName && wrapperComponentPath) {
      const componentPath = getComponentPath(id, wrapperComponentPath);
      wrapperComponentImp = `import ${wrapperComponentName} from '${componentPath}'
`;
      html = ` const markdown = 
        <${wrapperComponentName} attributes={${attributesString}}>
          ${html}
        </${wrapperComponentName}>
      `;
    } else {
      html = ` const markdown = ${html}`;
    }
    const compiledReactCode = `
    export default function React__Markdown () {
      ${(0, import_core.transformSync)(html, {
      ast: false,
      filename: id,
      presets: ["@babel/preset-react"],
      plugins: []
    }).code}
      return markdown
    }
    `;
    let markdownComponentsImp = "";
    const keys = Object.keys(importComponentsPath);
    if (importComs.length) {
      let componentsImportPath;
      if (!keys.length)
        componentsImportPath = getDefaultImportCom(importComs);
      else
        componentsImportPath = importComponentsPath;
      Object.keys(componentsImportPath).forEach((e) => {
        const componentPath = getComponentPath(id, componentsImportPath[e]);
        markdownComponentsImp += `import ${e} from '${componentPath}'
`;
      });
    }
    if (transforms.after)
      html = transforms.after(compiledReactCode, id);
    let code = "import React from 'react'\n";
    code += `${wrapperComponentImp}
`;
    code += `${markdownComponentsImp}
`;
    code += `${compiledReactCode}`;
    code += `export const attributes = ${attributesString}`;
    return {
      code,
      map: {
        mappings: ""
      }
    };
    function markCodeAsPre(node) {
      if (node instanceof import_domhandler.Element) {
        if (node.tagName)
          transformAttribs(node.attribs);
        if (node.tagName === "code") {
          let codeContent = (0, import_dom_serializer.default)(node, { decodeEntities: true });
          codeContent = codeContent.replace(/([\\`])/g, "\\$1").replace(/vfmless;/g, "<").replace(/vfmbracket;/g, "{");
          node.attribs.dangerouslySetInnerHTML = `vfm{{ __html: \`${codeContent}\`}}vfm`;
          node.childNodes = [];
        }
        if (node.childNodes.length) {
          node.childNodes.forEach((e) => {
            markCodeAsPre(e);
          });
        }
      }
    }
  };
}

// src/index.ts
function VitePluginReactMarkdown(userOptions = {}) {
  const options = resloveOptions(userOptions);
  const markdownToReact = createMarkdown(options);
  const filter = (0, import_pluginutils.createFilter)(
    userOptions.include || /\.md$/,
    userOptions.exclude
  );
  return {
    name: "vite-plugin-react-markdown",
    enforce: "pre",
    transform(raw, id) {
      if (!filter(id))
        return;
      try {
        return markdownToReact(id, raw);
      } catch (e) {
        this.error(e);
      }
    },
    async handleHotUpdate(ctx) {
      if (!filter(ctx.file))
        return;
      const defaultRead = ctx.read;
      ctx.read = async function() {
        return markdownToReact(ctx.file, await defaultRead()).code;
      };
    }
  };
}
var src_default = VitePluginReactMarkdown;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
