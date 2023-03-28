import { Plugin } from 'vite';
import { FilterPattern } from '@rollup/pluginutils';
import MarkdownIt from 'markdown-it';

interface importComponentOptions {
    [name: string]: string;
}
interface Options {
    /**
     * Parse for frontmatter
     *
     * @default true
     */
    /**
     * Class names for wrapper div
     *
     * @default 'markdown-body'
     */
    wrapperClasses?: string | string[];
    /**
     * Component name to wrapper with
     *
     * @default undefined
     */
    wrapperComponentName?: string | undefined | null;
    /**
     * Component path to wrapper with
     *
     * @default undefined
     */
    wrapperComponentPath?: string | undefined | null;
    /**
     * Components are contained in markdown
     */
    importComponentsPath?: importComponentOptions;
    /**
     * Options passed to Markdown It
     */
    markdownItOptions?: MarkdownIt.Options;
    /**
      * Plugins for Markdown It
      */
    markdownItUses?: (MarkdownIt.PluginSimple | [MarkdownIt.PluginSimple | MarkdownIt.PluginWithOptions<any>, any] | any)[];
    /**
     * A function providing the Markdown It instance gets the ability to apply custom
     * settings/plugins
     */
    markdownItSetup?: (MarkdownIt: MarkdownIt) => void;
    /**
     * Custom tranformations apply before and after the markdown transformation
     */
    transforms?: {
        before?: (code: string, id: string) => string;
        after?: (code: string, id: string) => string;
    };
    include?: FilterPattern;
    exclude?: FilterPattern;
}

declare function VitePluginReactMarkdown(userOptions?: Options): Plugin;

export { VitePluginReactMarkdown as default };
