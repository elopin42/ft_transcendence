'use client';

interface IconButtonProps {
    src: string;
    alt: string;
    onClick?: () => void;
    height?: number;
}

export default function IconButton({ src, alt, onClick, height = 56 }: IconButtonProps) {
    return (
        <button
            onClick={onClick}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, pointerEvents: 'auto' }}
            onMouseDown={e => (e.currentTarget.style.opacity = '0.5')}
            onMouseUp={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
            <img src={src} alt={alt} draggable={false} style={{ height, width: 'auto' }} />
        </button>
    );
}
