(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/Documents/Ecole/42/Cursus/ft_transcendence/frontend/components/DebugPanel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DebugPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Ecole/42/Cursus/ft_transcendence/frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Ecole/42/Cursus/ft_transcendence/frontend/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Ecole/42/Cursus/ft_transcendence/frontend/node_modules/next/navigation.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function DebugPanel() {
    _s();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const handleLogout = async ()=>{
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
        // ignore — on redirige quand même
        }
        router.push('/');
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            position: 'fixed',
            bottom: 10,
            right: 10,
            zIndex: 9999
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>setOpen(!open),
                style: {
                    background: open ? '#333' : '#555',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                    cursor: 'pointer',
                    fontSize: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                },
                children: open ? '✕' : '☰'
            }, void 0, false, {
                fileName: "[project]/Documents/Ecole/42/Cursus/ft_transcendence/frontend/components/DebugPanel.tsx",
                lineNumber: 24,
                columnNumber: 7
            }, this),
            open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: 'absolute',
                    bottom: 50,
                    right: 0,
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: 8,
                    padding: 8,
                    minWidth: 150,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: handleLogout,
                    style: {
                        background: '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: 13
                    },
                    children: "Déconnexion"
                }, void 0, false, {
                    fileName: "[project]/Documents/Ecole/42/Cursus/ft_transcendence/frontend/components/DebugPanel.tsx",
                    lineNumber: 60,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/Documents/Ecole/42/Cursus/ft_transcendence/frontend/components/DebugPanel.tsx",
                lineNumber: 45,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Documents/Ecole/42/Cursus/ft_transcendence/frontend/components/DebugPanel.tsx",
        lineNumber: 22,
        columnNumber: 5
    }, this);
}
_s(DebugPanel, "ytWOlNORoNjKCJyRctHL6U+Vztg=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = DebugPanel;
var _c;
__turbopack_context__.k.register(_c, "DebugPanel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=0m4n_Ecole_42_Cursus_ft_transcendence_frontend_components_DebugPanel_tsx_0yzmo7.._.js.map