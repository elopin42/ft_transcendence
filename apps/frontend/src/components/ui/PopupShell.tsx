'use client';
import IconButton from './IconButton';
import { teal } from '@/lib/colors';

interface PopupShellProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    header?: React.ReactNode;
}

export default function PopupShell({ title, onClose, children, header }: PopupShellProps) {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} onClick={onClose}>
            <div
                style={{
                    position: 'absolute',
                    top: '22%', right: '2%',
                    width: 340, height: 480,
                    borderRadius: 20,
                    overflow: 'hidden',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#fff',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ background: teal, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {header}
                    <span style={{ fontWeight: 800, fontSize: 18, color: '#fff', flex: 1, textAlign: 'center' }}>
                        {title}
                    </span>
                    <IconButton src="/btn_cross.png" alt="fermer" onClick={onClose} height={44} />
                </div>
                <div style={{ padding: '14px', flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
