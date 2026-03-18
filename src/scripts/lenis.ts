import Lenis from 'lenis';

const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
});

document.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    const link = target.closest<HTMLAnchorElement>('a[href^="#"]');
    
    if (link) {
        const href = link.getAttribute('href');
        
        if (href && href !== '#') {
            e.preventDefault();
            
            const element = document.querySelector<HTMLElement>(href);
            
            if (element) {
                lenis.scrollTo(element, {
                    duration: 1.2,
                });
            }
        }
    }
});

function raf(time: number) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

export default lenis;