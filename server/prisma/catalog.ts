/**
 * Catálogo de DEMOSTRACIÓN de Mafer: postres y velas.
 * Nombres, descripciones, precios (MXN) y existencias son EJEMPLOS para mostrar la tienda.
 * Las fotos (client/public/productos) son imágenes ilustrativas de referencia: reemplázalas
 * por fotos propias antes de vender. Todo se puede editar después desde el panel /admin.
 */
import type { InventoryMode, OptionType } from "@prisma/client";

export type Opt = { name: string; type: OptionType; isRequired?: boolean; maxLength?: number; values?: [string, number][] };
export type CatalogProduct = {
  slug: string;
  name: string;
  category: string;
  short: string;
  description: string;
  price: number; // pesos
  sale?: number;
  featured?: boolean;
  mode: InventoryMode;
  stock?: number;
  low?: number; // alerta de inventario bajo
  prep: number; // horas
  variants?: [string, number][]; // [nombre, recargo en pesos]
  options?: Opt[];
};

export const categories = [
  { slug: "pasteles", name: "Pasteles", description: "Clásicos de la casa para compartir.", sortOrder: 1 },
  { slug: "pasteles-personalizados", name: "Pasteles personalizados", description: "Diseñados contigo para tu celebración.", sortOrder: 2 },
  { slug: "cupcakes", name: "Cupcakes", description: "Pequeños, esponjosos y decorados a mano.", sortOrder: 3 },
  { slug: "donas", name: "Donas", description: "Esponjosas, glaseadas y recién hechas.", sortOrder: 4 },
  { slug: "galletas", name: "Galletas", description: "Horneadas en pequeños lotes cada día.", sortOrder: 5 },
  { slug: "pan-dulce", name: "Pan dulce", description: "Para el café, la merienda o cualquier antojo.", sortOrder: 6 },
  { slug: "postres-especiales", name: "Postres especiales", description: "Rebanadas y postres individuales.", sortOrder: 7 },
  { slug: "velas", name: "Velas de postre", description: "Velas aromáticas hechas a mano con forma de postre. No son comestibles.", sortOrder: 8 },
];

/** Categorías de la demostración anterior que ya no se usan: se ocultan. */
export const retiredCategories = ["cajas-de-regalo", "paquetes-para-eventos", "promociones"];

// ───────── Opciones reutilizables ─────────
const tamanos: [string, number][] = [["Chico · 8 a 10 porciones", 0], ["Mediano · 15 a 20 porciones", 260], ["Grande · 25 a 30 porciones", 560]];
const mensaje: Opt = { name: "Mensaje en el pastel", type: "TEXT", maxLength: 40 };
const personalizado: Opt[] = [
  { name: "Sabor del pan", type: "SINGLE", isRequired: true, values: [["Vainilla", 0], ["Chocolate", 0], ["Red velvet", 50], ["Zanahoria", 50]] },
  { name: "Relleno", type: "SINGLE", isRequired: true, values: [["Crema pastelera", 0], ["Ganache", 0], ["Frutos rojos", 60], ["Cajeta", 40]] },
  { name: "Cobertura", type: "SINGLE", isRequired: true, values: [["Buttercream", 0], ["Chantilly", 0], ["Queso crema", 60]] },
  { name: "Decoración extra", type: "MULTIPLE", values: [["Moños de listón", 60], ["Perlas comestibles", 45], ["Cerezas", 50], ["Flores naturales comestibles", 150]] },
  { name: "Colores", type: "TEXT", maxLength: 60 },
  { name: "Temática", type: "TEXT", maxLength: 80 },
  mensaje,
  { name: "Instrucciones adicionales", type: "TEXT", maxLength: 300 },
];
const cupcakeCajas: [string, number][] = [["1 pieza", 0], ["Caja de 6", 0], ["Caja de 12", 0]];
const cupcake = (base: number) => cupcakeCajas.map(([n], i) => [n, [0, base * 5 - 10, base * 11 - 25][i]] as [string, number]);
const donaCajas = (base: number): [string, number][] => [["1 pieza", 0], ["Caja de 6", base * 5 - 15], ["Caja de 12", base * 11 - 40]];
const galletaBolsas = (base: number): [string, number][] => [["1 pieza", 0], ["Bolsa de 6", base * 5 - 10], ["Caja de 12", base * 11 - 30]];
const panPiezas = (base: number): [string, number][] => [["1 pieza", 0], ["Paquete de 6", base * 5 - 10]];
const aroma: Opt = { name: "Aroma", type: "SINGLE", isRequired: true, values: [["Vainilla", 0], ["Fresa", 0], ["Chocolate", 0], ["Canela", 0], ["Sin aroma", 0]] };
const empaque: Opt = { name: "Presentación", type: "SINGLE", isRequired: true, values: [["Sin empaque", 0], ["Caja de regalo con moño", 35]] };
const tarjeta: Opt = { name: "Tarjeta con mensaje", type: "TEXT", maxLength: 120 };
const vela = [aroma, empaque, tarjeta];

export const products: CatalogProduct[] = [
  // ───── Pasteles ─────
  { slug: "pastel-de-chocolate", name: "Pastel de chocolate", category: "pasteles", featured: true, price: 560, mode: "MADE_TO_ORDER", prep: 48,
    short: "Bizcocho de cacao con ganache y rosetas de chocolate.",
    description: "Capas de bizcocho de chocolate húmedo, relleno y cubierta de ganache semiamargo, decorado con rosetas y láminas de chocolate. Para quienes nunca tienen suficiente chocolate.",
    variants: tamanos, options: [{ name: "Relleno", type: "SINGLE", isRequired: true, values: [["Ganache", 0], ["Cajeta", 40], ["Frambuesa", 60]] }, mensaje] },
  { slug: "pastel-vintage-monos-rojos", name: "Pastel vintage de moños rojos", category: "pasteles", price: 650, mode: "MADE_TO_ORDER", prep: 72,
    short: "Estilo vintage con olanes de crema y moños rojos.",
    description: "Pastel de vainilla cubierto de buttercream blanco, con olanes, guirnaldas y moños en rojo intenso. Un clásico romántico para aniversarios y cenas especiales.",
    variants: tamanos, options: [mensaje] },
  { slug: "pastel-feliz-cumpleanos", name: "Pastel «Happy birthday»", category: "pasteles", featured: true, price: 590, mode: "MADE_TO_ORDER", prep: 48,
    short: "Alegre, colorido y listo para soplar las velas.",
    description: "Pastel de vainilla con relleno de crema pastelera, cubierta de buttercream, letras de colores y base de perlas en azul pastel. Cuéntanos los colores de la fiesta.",
    variants: tamanos, options: [{ name: "Colores", type: "TEXT", maxLength: 60 }, mensaje] },

  // ───── Pasteles personalizados ─────
  { slug: "pastel-vintage-azul-cerezas", name: "Pastel vintage azul con cerezas", category: "pasteles-personalizados", featured: true, price: 890, mode: "MADE_TO_ORDER", prep: 72,
    short: "Buttercream azul cielo, olanes blancos y cerezas.",
    description: "Nuestro pastel más pedido: estilo vintage en azul cielo con olanes, perlas y cerezas. Elige pan, relleno y colores; te confirmamos el diseño antes de prepararlo.",
    variants: tamanos, options: personalizado },
  { slug: "pastel-corazon-moras-azules", name: "Pastel corazón con moras azules", category: "pasteles-personalizados", featured: true, price: 950, mode: "MADE_TO_ORDER", prep: 72,
    short: "Forma de corazón, olanes azules y moras frescas.",
    description: "Pastel en forma de corazón con olanes en azul y blanco, coronado con moras azules frescas. Perfecto para San Valentín, aniversarios o un «te quiero» con estilo.",
    variants: tamanos, options: personalizado },
  { slug: "pastel-corazon-vintage-rosas", name: "Pastel corazón vintage con rosas", category: "pasteles-personalizados", price: 920, mode: "MADE_TO_ORDER", prep: 72,
    short: "Corazón color crema con rosas de buttercream.",
    description: "Pastel de corazón en tono crema con borde de rosetas, guirnaldas y pequeñas rosas rosadas hechas a mano. Delicado y elegante para cualquier celebración.",
    variants: tamanos, options: personalizado },
  { slug: "pastel-personalizado-monos-rosas", name: "Pastel con moños rosas", category: "pasteles-personalizados", price: 870, mode: "MADE_TO_ORDER", prep: 72,
    short: "Minimalista, con moños de listón rosa.",
    description: "Pastel blanco con detalles florales finos y moños de listón rosa alrededor. Ideal para baby showers, despedidas y celebraciones íntimas.",
    variants: tamanos, options: personalizado },

  // ───── Cupcakes ─────
  { slug: "cupcake-de-fiesta", name: "Cupcake de fiesta", category: "cupcakes", featured: true, price: 48, mode: "TRACKED", stock: 30, prep: 0,
    short: "Vainilla con chispas, betún azul y cereza.",
    description: "Bizcocho de vainilla con chispas de colores, betún azul pastel y una cereza encima. El favorito de las fiestas infantiles.",
    variants: cupcake(48) },
  { slug: "cupcake-de-fresa", name: "Cupcake de fresa", category: "cupcakes", price: 48, mode: "TRACKED", stock: 24, prep: 0,
    short: "Bizcocho de fresa, betún rosa y fresa natural.",
    description: "Bizcocho de fresa con trocitos de fruta, betún de fresa y una fresa natural con salsa roja.",
    variants: cupcake(48) },
  { slug: "cupcake-cookies-and-cream", name: "Cupcake cookies & cream", category: "cupcakes", price: 52, mode: "TRACKED", stock: 24, prep: 0,
    short: "Chocolate con betún de galleta y galleta entera.",
    description: "Bizcocho de chocolate, betún de chocolate con galleta triturada y una galleta de chocolate entera como corona.",
    variants: cupcake(52) },
  { slug: "cupcake-chocochip", name: "Cupcake chocochip", category: "cupcakes", price: 50, mode: "TRACKED", stock: 18, prep: 0,
    short: "Vainilla con chispas y mini galleta.",
    description: "Bizcocho de vainilla con chispas de chocolate, betún de caramelo y una mini galleta con chispas.",
    variants: cupcake(50) },
  { slug: "cupcake-chocolate-cereza", name: "Cupcake de chocolate y cereza", category: "cupcakes", price: 50, mode: "TRACKED", stock: 18, prep: 0,
    short: "Chocolate, betún de vainilla y cereza.",
    description: "Bizcocho de chocolate con betún suave de vainilla, virutas de chocolate y una cereza.",
    variants: cupcake(50) },
  { slug: "cupcake-menta-chocolate", name: "Cupcake de menta y chocolate", category: "cupcakes", price: 52, mode: "TRACKED", stock: 4, low: 6, prep: 0,
    short: "Chocolate con betún de menta fresca.",
    description: "Bizcocho de chocolate con betún verde de menta, chispas de chocolate y una hoja de menta.",
    variants: cupcake(52) },
  { slug: "cupcake-mora-azul", name: "Cupcake de mora azul", category: "cupcakes", price: 50, mode: "TRACKED", stock: 18, prep: 0,
    short: "Betún lila de mora con moras frescas.",
    description: "Bizcocho de vainilla con moras, betún lila de mora azul y moras frescas con su salsa.",
    variants: cupcake(50) },

  // ───── Donas ─────
  { slug: "dona-rosa-chispas", name: "Dona rosa con chispas", category: "donas", price: 35, mode: "TRACKED", stock: 30, prep: 0,
    short: "Glaseado de fresa con chispas de colores.",
    description: "Dona esponjosa con glaseado rosa de fresa y chispas de colores. La clásica que a todos se les antoja.",
    variants: donaCajas(35) },
  { slug: "dona-doble-chocolate", name: "Dona doble chocolate", category: "donas", price: 40, mode: "TRACKED", stock: 24, prep: 0,
    short: "Cubierta de chocolate con chispas de chocolate.",
    description: "Dona con cubierta brillante de chocolate, hilos de chocolate y muchas chispas.",
    variants: donaCajas(40) },
  { slug: "dona-red-velvet", name: "Dona red velvet", category: "donas", featured: true, price: 42, mode: "TRACKED", stock: 20, prep: 0,
    short: "Glaseado rojo con decoración de queso crema.",
    description: "Dona de red velvet con glaseado rojo, líneas y perlas de queso crema.",
    variants: donaCajas(42) },
  { slug: "dona-glaseada-almendra", name: "Dona glaseada con almendra", category: "donas", price: 40, mode: "TRACKED", stock: 18, prep: 0,
    short: "Glaseado de vainilla y almendra fileteada.",
    description: "Dona con glaseado de vainilla cubierta de almendra fileteada tostada.",
    variants: donaCajas(40) },
  { slug: "mini-dona-almendra", name: "Mini dona de almendra", category: "donas", price: 22, mode: "TRACKED", stock: 40, prep: 0,
    short: "Pequeña, con glaseado y almendra.",
    description: "Versión mini de nuestra dona de almendra, perfecta para mesas de postres.",
    variants: [["1 pieza", 0], ["Caja de 12", 220]] },
  { slug: "dona-de-limon", name: "Dona de limón", category: "donas", price: 38, mode: "TRACKED", stock: 20, prep: 0,
    short: "Glaseado cítrico verde con chispas doradas.",
    description: "Dona con glaseado de limón, ralladura y chispas doradas. Fresca y ligera.",
    variants: donaCajas(38) },
  { slug: "dona-de-pistache", name: "Dona de pistache", category: "donas", price: 45, mode: "TRACKED", stock: 15, prep: 0,
    short: "Glaseado blanco, pistache y almendra.",
    description: "Dona con glaseado blanco, crema de pistache en hilos y almendra.",
    variants: donaCajas(45) },
  { slug: "trio-donas-chocolate", name: "Trío de donas de chocolate", category: "donas", price: 120, sale: 99, mode: "TRACKED", stock: 12, prep: 0,
    short: "Tres donas con chocolate oscuro y de leche.",
    description: "Tres donas con cubiertas de chocolate oscuro y de leche, con hilos de chocolate. Precio especial por tiempo limitado." },

  // ───── Galletas ─────
  { slug: "galleta-centro-fundido", name: "Galleta con centro fundido", category: "galletas", featured: true, price: 45, mode: "TRACKED", stock: 30, prep: 0,
    short: "Gigante, con trozos y centro de chocolate líquido.",
    description: "Galleta gruesa con trozos de chocolate y un centro de chocolate que se derrite. Recomendamos calentarla 10 segundos.",
    variants: galletaBolsas(45) },
  { slug: "galleta-gigante-chocolate", name: "Galleta gigante con chocolate", category: "galletas", price: 40, mode: "TRACKED", stock: 30, prep: 0,
    short: "Crujiente por fuera, suave por dentro.",
    description: "Galleta de mantequilla con grandes trozos de chocolate semiamargo.",
    variants: galletaBolsas(40) },
  { slug: "galleta-red-velvet", name: "Galleta red velvet", category: "galletas", price: 45, sale: 39, mode: "TRACKED", stock: 24, prep: 0,
    short: "Red velvet con trozos de chocolate blanco.",
    description: "Galleta suave de red velvet con trozos de chocolate blanco.",
    variants: galletaBolsas(45) },
  { slug: "galleta-matcha-chocolate-blanco", name: "Galleta de matcha", category: "galletas", price: 45, mode: "TRACKED", stock: 20, prep: 0,
    short: "Té verde matcha con chocolate blanco.",
    description: "Galleta de matcha con trozos de chocolate blanco: un equilibrio entre dulce y herbal.",
    variants: galletaBolsas(45) },
  { slug: "galleta-rellena-pistache", name: "Galleta rellena de pistache", category: "galletas", price: 55, mode: "TRACKED", stock: 3, low: 5, prep: 0,
    short: "Chocolate por fuera, crema de pistache por dentro.",
    description: "Galleta de chocolate espolvoreada con cacao y un relleno cremoso de pistache.",
    variants: galletaBolsas(55) },
  { slug: "galleta-fresas-con-crema", name: "Galleta de fresas con crema", category: "galletas", price: 48, mode: "TRACKED", stock: 18, prep: 0,
    short: "Galleta con betún de fresa y fresa natural.",
    description: "Galleta de mantequilla cubierta de betún de fresa, crumble y una rebanada de fresa.",
    variants: galletaBolsas(48) },
  { slug: "galleta-glaseada-fresa", name: "Galleta glaseada de fresa", category: "galletas", price: 35, mode: "TRACKED", stock: 30, prep: 0,
    short: "Glaseado rosa con chispas blancas.",
    description: "Galleta de azúcar con glaseado de fresa en espiral y chispas.",
    variants: galletaBolsas(35) },
  { slug: "galleta-corazon-mermelada", name: "Galleta corazón de mermelada", category: "galletas", price: 30, mode: "TRACKED", stock: 36, prep: 0,
    short: "Mantequilla con corazón de mermelada de fresa.",
    description: "Galleta de mantequilla con centro de mermelada de fresa en forma de corazón.",
    variants: galletaBolsas(30) },
  { slug: "galletas-sandwich-chocolate", name: "Galletas sándwich de chocolate", category: "galletas", price: 35, mode: "TRACKED", stock: 30, prep: 0,
    short: "Rellenas de ganache, con ventana de corazón.",
    description: "Galletas de cacao rellenas de ganache con una ventana en forma de corazón.",
    variants: galletaBolsas(35) },

  // ───── Pan dulce ─────
  { slug: "rol-de-canela", name: "Rol de canela", category: "pan-dulce", featured: true, price: 45, mode: "TRACKED", stock: 20, prep: 0,
    short: "Esponjoso, con canela y glaseado de vainilla.",
    description: "Pan suave enrollado con azúcar y canela, bañado con glaseado de vainilla.",
    variants: panPiezas(45) },
  { slug: "croissant-de-mantequilla", name: "Croissant de mantequilla", category: "pan-dulce", price: 38, mode: "TRACKED", stock: 20, prep: 0,
    short: "Hojaldrado, dorado y con mucha mantequilla.",
    description: "Croissant de masa laminada con mantequilla, crujiente por fuera y suave por dentro.",
    variants: panPiezas(38) },
  { slug: "pan-brioche", name: "Pan brioche", category: "pan-dulce", price: 35, mode: "TRACKED", stock: 15, prep: 0,
    short: "Pan de mantequilla suave y dorado.",
    description: "Brioche esponjoso con huevo y mantequilla, ideal para el desayuno.",
    variants: panPiezas(35) },
  { slug: "pan-osito", name: "Pan osito", category: "pan-dulce", price: 30, mode: "TRACKED", stock: 20, prep: 0,
    short: "Pan dulce en forma de osito.",
    description: "Pan suave de leche en forma de osito, relleno de crema pastelera. Encanta a los niños.",
    variants: panPiezas(30) },
  { slug: "orejitas-de-hojaldre", name: "Orejitas de hojaldre", category: "pan-dulce", price: 25, mode: "TRACKED", stock: 30, prep: 0,
    short: "Hojaldre caramelizado y crujiente.",
    description: "Palmeras de hojaldre caramelizadas con azúcar, crujientes y ligeras.",
    variants: panPiezas(25) },
  { slug: "muffin-doble-chocolate", name: "Muffin doble chocolate", category: "pan-dulce", price: 40, mode: "TRACKED", stock: 18, prep: 0,
    short: "Chocolate con chispas de chocolate.",
    description: "Muffin húmedo de chocolate con chispas de chocolate por dentro y por fuera.",
    variants: panPiezas(40) },
  { slug: "muffin-mora-azul", name: "Muffin de mora azul", category: "pan-dulce", price: 40, mode: "TRACKED", stock: 18, prep: 0,
    short: "Vainilla con moras azules y costra de azúcar.",
    description: "Muffin de vainilla con moras azules y costra crujiente de azúcar.",
    variants: panPiezas(40) },

  // ───── Postres especiales ─────
  { slug: "cheesecake-mora-azul", name: "Cheesecake de mora azul", category: "postres-especiales", price: 75, mode: "MADE_TO_ORDER", prep: 24,
    short: "Cremoso, con base de galleta y mora azul.",
    description: "Cheesecake horneado estilo New York sobre base de galleta, con cubierta de mora azul.",
    variants: [["Rebanada", 0], ["Pastel entero (10 rebanadas)", 545]] },
  { slug: "brownie-chocolate", name: "Brownie de chocolate", category: "postres-especiales", price: 40, mode: "TRACKED", stock: 24, prep: 0,
    short: "Denso, húmedo y con chocolate derretido.",
    description: "Brownie de chocolate semiamargo con costra brillante y salsa de chocolate.",
    variants: [["1 pieza", 0], ["Caja de 6", 190]] },

  // ───── Velas de postre ─────
  { slug: "vela-pastelito-fresas", name: "Vela pastelito de fresas", category: "velas", featured: true, price: 320, mode: "TRACKED", stock: 8, prep: 0,
    short: "Vela de cera de soya con forma de shortcake de fresa.",
    description: "Vela artesanal de cera de soya con forma de pastelito de fresas con crema y bola de helado. Decorativa y aromática. No es comestible.",
    options: vela },
  { slug: "vela-cupcake-chocolate", name: "Vela cupcake de chocolate", category: "velas", featured: true, price: 260, mode: "TRACKED", stock: 10, prep: 0,
    short: "Cupcake de cera con chocolate y tableta.",
    description: "Vela con forma de cupcake de vainilla bañado en chocolate, con trocitos y tableta de chocolate. No es comestible.",
    options: vela },
  { slug: "vela-cheesecake-mora", name: "Vela cheesecake de mora", category: "velas", price: 280, mode: "TRACKED", stock: 6, prep: 0,
    short: "Mini cheesecake de cera con moras.",
    description: "Vela con forma de mini cheesecake con cubierta de mora y moras azules. No es comestible.",
    options: vela },
  { slug: "vela-pastel-rosa-galleta", name: "Vela pastel rosa con galleta", category: "velas", price: 290, mode: "TRACKED", stock: 7, prep: 0,
    short: "Pastelito rosa con glaseado, galleta y fresa.",
    description: "Vela con forma de pastelito rosa con glaseado blanco escurrido, galleta y fresa. No es comestible.",
    options: vela },
  { slug: "vela-vaso-fresas-crema", name: "Vela vaso de fresas con crema", category: "velas", price: 340, mode: "TRACKED", stock: 5, prep: 0,
    short: "Vaso de vidrio con fresas, crema y galletas de cera.",
    description: "Vela en vaso de vidrio reutilizable con capas de fresa y crema, decorada con fresas y galletitas. No es comestible.",
    options: vela },
  { slug: "velas-pastel-corazon", name: "Set de velas pastel corazón", category: "velas", price: 420, sale: 359, mode: "TRACKED", stock: 4, prep: 0,
    short: "Dos velas: corazón con moño y pastelito con fresas.",
    description: "Set de dos velas estilo vintage: un corazón rosa con moño y un pastelito blanco con fresas. Precio especial por tiempo limitado. No son comestibles.",
    options: vela },
  { slug: "velas-croissant-frambuesa", name: "Set de 4 velas croissant", category: "velas", featured: true, price: 380, mode: "TRACKED", stock: 6, prep: 0,
    short: "Cuatro croissants de cera con crema y frambuesas.",
    description: "Set de cuatro velas con forma de croissant con crema y frambuesas. Lindas para centros de mesa. No son comestibles.",
    options: vela },
  { slug: "velas-copa-helado", name: "Vela copa de helado", category: "velas", price: 220, mode: "TRACKED", stock: 12, prep: 0,
    short: "Bola de helado de cera en copa de vidrio.",
    description: "Vela con forma de helado en copa de vidrio, con cereza. Disponible en rosa, vainilla o azul. No es comestible.",
    options: [{ name: "Color", type: "SINGLE", isRequired: true, values: [["Rosa", 0], ["Vainilla", 0], ["Azul", 0]] }, ...vela] },
  { slug: "velas-cupcake-helado", name: "Vela cupcake helado", category: "velas", price: 190, mode: "TRACKED", stock: 15, prep: 0,
    short: "Cupcake de cera en colores pastel.",
    description: "Vela con forma de cupcake con bola de helado en colores pastel y frutitas. No es comestible.",
    options: [{ name: "Color", type: "SINGLE", isRequired: true, values: [["Rosa", 0], ["Amarillo", 0], ["Verde menta", 0], ["Azul", 0]] }, ...vela] },
  { slug: "velas-gelatina-rosa", name: "Set de velas gelatina rosa", category: "velas", price: 350, mode: "TRACKED", stock: 2, low: 3, prep: 0,
    short: "Tres gelatinas de cera y vela de burbujas corazón.",
    description: "Set de tres velas con forma de gelatina en capas rosa y crema, más una vela de burbujas de corazones. No son comestibles.",
    options: vela },
];
