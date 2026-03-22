import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BotonComprar from "@/components/ui/BotonComprar.jsx";

gsap.registerPlugin(ScrollTrigger);

export default function Card({ producto }) {
  const href = `/productos/${producto.slug}`;
  const cardRef = useRef(null);

  useEffect(() => {
    const tween = gsap.to(cardRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: "power2.out",
      scrollTrigger: {
        trigger: cardRef.current,
        start: "top 95%",
        once: true,
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <article ref={cardRef} style={{ opacity: 0, transform: "translateY(40px)" }} className="shadow-xl rounded-xl overflow-hidden flex flex-col">

        <a href={href} className="bg-gray/10 h-60 flex items-center justify-center overflow-hidden">

            {producto.image ? (
            <img
                src={producto.image}
                alt={producto.name}
                className="object-cover h-full w-full transition-transform duration-300 hover:scale-105"
            />
            ) : (
                <span className="text-gray text-sm">Sin imagen</span>
            )}

        </a>

        <div className="flex flex-col flex-1 gap-2 p-4 justify-between">

            {(producto.category || producto.marca) && (
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-accent">
                    {[producto.category, producto.marca].filter(Boolean).join(" ")}
                </span>
            )}

            <h3 className="font-bold text-black text-lg leading-tight">
                {producto.name || "Producto sin nombre"}
            </h3>

            <div className="flex items-center justify-between mt-5">

                <span className="text-xl font-bold text-primary">
                    ${producto.price.toLocaleString("es-AR")}
                </span>
                {producto.stock === 0 && (
                    <span className="text-xs text-primary font-medium">Sin stock</span>
                )}

                <BotonComprar
                    onClick={() => window.location.href = href}
                    disabled={producto.stock === 0}
                />

            </div>

        </div>

    </article>
  );
}