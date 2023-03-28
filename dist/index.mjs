// src/index.ts
import { createFilter } from "@rollup/pluginutils";

// src/utils.ts
import { cwd } from "process";
import { dirname, isAbsolute, relative, resolve } from "path";
import fs from "fs-extra";
import pc from "picocolors";
var { existsSync, readdirSync } = fs;
function toArray(array) {
  array = array || [];
  if (Array.isArray(array))
    return array;
  return [array];
}
function getComponentPath(id, componentPath) {
  if (!isAbsolute(componentPath))
    componentPath = resolve(cwd(), componentPath);
  const t = relative(dirname(id), componentPath).replaceAll(/\\/g, "/");
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
  const defaultPath = resolve(cwd(), DEFAULT_IMPORT_PATH);
  const res = {};
  if (!existsSync(defaultPath) && !!importComs) {
    const componentsNames = importComs.join(" ");
    console.log(
      pc.yellow(`
        \u26A0\uFE0F the md file had undefined component name \`${pc.bold(componentsNames)}\`
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
import MarkdownIt from "markdown-it";
import { parseDocument } from "htmlparser2";
import render from "dom-serializer";
import frontMatter from "front-matter";
import { transformSync } from "@babel/core";
import { componentPlugin } from "@mdit-vue/plugin-component";
import { Element } from "domhandler";
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
  const markdown = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    xhtmlOut: true,
    ...options.markdownItOptions
  });
  markdown.use(componentPlugin);
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
    const { body, attributes } = frontMatter(raw);
    const attributesString = JSON.stringify(attributes);
    if (transforms.before)
      raw = transforms.before(raw, id);
    const env = { id };
    let html = markdown.render(body, env);
    const { importComs } = getImportComInMarkdown(html, wrapperComponentName);
    html = html.replace(/&lt;/g, "vfmless;").replace(/{/g, "vfmbracket;");
    const root = parseDocument(html, { lowerCaseTags: false });
    if (root.children.length) {
      Array.from(root.children).forEach((e) => {
        markCodeAsPre(e);
      });
    }
    const h = render(root, {
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
      ${transformSync(html, {
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
      if (node instanceof Element) {
        if (node.tagName)
          transformAttribs(node.attribs);
        if (node.tagName === "code") {
          let codeContent = render(node, { decodeEntities: true });
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
  const filter = createFilter(
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
export {
  src_default as default
};
