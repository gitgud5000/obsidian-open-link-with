import { ItemView, PaneType, WorkspaceLeaf } from 'obsidian'
import { BuiltinIcon } from './obsidian/types'
import { OpenLinkPluginITF, ViewMode, ViewRec } from './types'
import { log } from './utils'

class InAppView extends ItemView {
    public icon: BuiltinIcon = 'link'
    public frame: HTMLIFrameElement
    public title: string
    constructor(leaf: WorkspaceLeaf, public url: string) {
        super(leaf)
        this.title = new URL(url).host
        // TODO: remove this after tab title issue is fixed
        this.leaf.setPinned(true)
        setTimeout(() => {
            this.leaf.setPinned(false)
        }, 10)
    }
    async onOpen(): Promise<void> {
        const frame_styles: string[] = [
            'height: 100%',
            'width: 100%',
            'background-color: white', // for pages with no background
        ]
        this.frame = document.createElement('iframe')
        this.frame.setAttr('style', frame_styles.join('; '))
        this.frame.setAttr('src', this.url)
        this.containerEl.children[1].appendChild(this.frame)
    }
    getDisplayText(): string {
        return this.title
    }
    getViewType(): string {
        return 'OOLW::InAppView'
    }
}

class WebViewerView extends ItemView {
    public icon: BuiltinIcon = 'popup-open'
    public title: string
    constructor(leaf: WorkspaceLeaf, public url: string) {
        super(leaf)
        this.title = new URL(url).host
        // TODO: remove this after tab title issue is fixed
        this.leaf.setPinned(true)
        setTimeout(() => {
            this.leaf.setPinned(false)
        }, 10)
    }
    async onOpen(): Promise<void> {
        // Always use Obsidian's built-in web viewer core plugin (1.9+)
        // No iframe fallback - user explicitly requested to use only the core plugin
        try {
            // Check if the browser view type is available in Obsidian 1.9+
            const app = this.app as any
            
            if (app.viewRegistry && app.viewRegistry.viewByType && 
                app.viewRegistry.viewByType['browser']) {
                // Use the built-in browser view
                const browserLeaf = this.app.workspace.getLeaf('tab')
                await browserLeaf.setViewState({
                    type: 'browser',
                    state: { url: this.url }
                })
                
                // If successful, switch to that leaf and close this one
                this.app.workspace.setActiveLeaf(browserLeaf)
                this.leaf.detach()
                return
            } else {
                // Core browser view not available - show error instead of fallback
                throw new Error('Obsidian core browser view is not available. Please ensure you are using Obsidian 1.9+ and the core browser plugin is enabled.')
            }
        } catch (error) {
            // Log error and show it to the user instead of falling back to iframe
            try {
                const app = this.app as any
                if (app.plugins?.plugins?.['open-link-with']?.settings?.enableLog) {
                    log('error', 'Failed to open URL with core browser view', error)
                }
            } catch (logError) {
                // Ignore logging errors
            }
            
            // Display error message to user instead of iframe fallback
            const errorContainer = document.createElement('div')
            errorContainer.setAttr('style', 'padding: 20px; text-align: center; color: var(--text-error);')
            errorContainer.innerHTML = `
                <h3>Web Viewer Unavailable</h3>
                <p>Unable to open link with Obsidian's core browser view:</p>
                <p style="font-style: italic;">${error.message || 'Unknown error'}</p>
                <p>Please ensure you are using Obsidian 1.9+ and the core browser plugin is enabled.</p>
                <p style="margin-top: 20px;">
                    <a href="${this.url}" style="color: var(--text-accent);">Open link externally: ${this.url}</a>
                </p>
            `
            this.containerEl.children[1].appendChild(errorContainer)
        }
    }
    getDisplayText(): string {
        return this.title
    }
    getViewType(): string {
        return 'OOLW::WebViewerView'
    }
}

class ViewMgr {
    constructor(public plugin: OpenLinkPluginITF) {}
    private _getLeafId(leaf: any): string {
        return leaf['id'] ?? ''
    }
    private _validRecords(): ViewRec[] {
        const records = this.plugin.settings.inAppViewRec ?? []
        const validRec: ViewRec[] = []
        try {
            for (const rec of records) {
                if (
                    this.plugin.app.workspace.getLeafById(rec.leafId) !== null
                ) {
                    validRec.push(rec)
                }
            }
        } catch (err) {
            if (this.plugin.settings.enableLog) {
                log('error', 'failed to restore views', `${err}`)
            }
        }
        return validRec
    }
    async createView(
        url: string,
        mode: ViewMode,
        options: {
            focus?: boolean
            paneType?: PaneType
            useWebViewer?: boolean
        } = {}
    ): Promise<string> {
        const getNewLeafId = (): string => {
            const newLeaf =
                typeof options.paneType === 'undefined'
                    ? false
                    : options.paneType
            const leaf = this.plugin.app.workspace.getLeaf(
                newLeaf === false ? 'tab' : newLeaf // TODO: missing navigation; using tab for now
            )
            return this._getLeafId(leaf)
        }
        let id: string = undefined
        // TODO: more robust open behaviors
        if (typeof options.paneType !== 'undefined' || mode === ViewMode.NEW) {
            id = getNewLeafId()
        } else {
            const viewRec = this._validRecords()
            let rec =
                viewRec.find(({ mode }) => mode === ViewMode.LAST) ??
                viewRec.find(({ mode }) => mode === ViewMode.NEW)
            id = rec?.leafId ?? getNewLeafId()
        }
        return await this.updateView(id, url, mode, options?.focus, options?.useWebViewer)
    }
    async updateView(
        leafId: string,
        url: string,
        mode: ViewMode,
        focus: boolean = true,
        useWebViewer: boolean = false
    ): Promise<string | null> {
        const leaf = this.plugin.app.workspace.getLeafById(leafId)
        if (leaf === null) {
            return null
        } else {
            const view = useWebViewer ? new WebViewerView(leaf, url) : new InAppView(leaf, url)
            await leaf.open(view)
            const rec = this.plugin.settings.inAppViewRec.find(
                (rec) => rec.leafId === leafId
            )
            if (typeof rec !== 'undefined') {
                rec.url = url
                // TODO:
                rec.mode = rec.mode ?? mode
            } else {
                this.plugin.settings.inAppViewRec.unshift({
                    leafId,
                    url,
                    mode,
                })
            }
            await this.plugin.saveSettings()
            // this.plugin.app.workspace.setActiveLeaf(leaf, { focus }) // TODO: option `focus` is not working (cliVer == 1.1.9)
            if (focus) {
                this.plugin.app.workspace.setActiveLeaf(leaf)
            }
            return leafId
        }
    }
    async createWebViewerView(
        url: string,
        mode: ViewMode,
        options: {
            focus?: boolean
            paneType?: PaneType
        } = {}
    ): Promise<string> {
        return await this.createView(url, mode, { ...options, useWebViewer: true })
    }
    async restoreView() {
        const viewRec = this._validRecords()
        const restored: ViewRec[] = []
        for (const rec of viewRec) {
            if (
                (await this.updateView(
                    rec.leafId,
                    rec.url,
                    rec.mode,
                    false
                )) !== null
            ) {
                restored.push(rec)
            }
        }
        this.plugin.settings.inAppViewRec = restored
        await this.plugin.saveSettings()
    }
}

export { InAppView, WebViewerView, ViewMgr, ViewMode, ViewRec }
