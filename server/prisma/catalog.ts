/**
 * Catálogo de DEMOSTRACIÓN de Mafer: velas artesanales.
 * Recuerdos para eventos (bautizo, baby shower, bodas, XV años), velas de temporada
 * (Navidad, Amor y amistad, Día de muertos, Halloween), aromáticas y velas con forma de postre.
 * Nombres, descripciones, precios (MXN) y existencias son EJEMPLOS. Las imágenes son ilustrativas
 * (ilustraciones en client/public/productos/velas y fotos de referencia en client/public/productos):
 * reemplázalas por fotos propias desde el panel /admin antes de vender.
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
  /** Ruta de la imagen; por omisión /productos/<slug>.webp */
  image?: string;
};

const ilustracion = (slug: string) => `/productos/velas/${slug}.svg`;

/** Las de temporada usan el mismo slug que la temporada en el sitio (ver client/src/lib/seasons.ts). */
export const categories = [
  { slug: "navidad", name: "Navidad", description: "Pino, ponche y jengibre para regalar y decorar en diciembre.", sortOrder: 1, imageUrl: ilustracion("pino-nevado") },
  { slug: "amor-y-amistad", name: "Amor y amistad", description: "Corazones y aromas dulces para el 14 de febrero.", sortOrder: 2, imageUrl: ilustracion("frasco-te-quiero") },
  { slug: "dia-de-muertos", name: "Día de muertos", description: "Cempasúchil, pan de muerto y calaveritas para tu ofrenda.", sortOrder: 3, imageUrl: ilustracion("cempasuchil") },
  { slug: "halloween", name: "Halloween", description: "Calabaza especiada y noches de brujas.", sortOrder: 4, imageUrl: ilustracion("calabaza-especiada") },
  { slug: "bautizo", name: "Bautizo", description: "Velas de ceremonia y recuerdos para tus invitados.", sortOrder: 5, imageUrl: ilustracion("vela-de-bautizo") },
  { slug: "baby-shower", name: "Baby shower", description: "Recuerdos tiernos en rosa, azul o neutro.", sortOrder: 6, imageUrl: ilustracion("frasco-oh-baby") },
  { slug: "bodas", name: "Bodas", description: "Vela de unidad y recuerdos con sus iniciales.", sortOrder: 7, imageUrl: ilustracion("vela-de-unidad") },
  { slug: "xv-y-cumpleanos", name: "XV años y cumpleaños", description: "Recuerdos en los colores de tu fiesta.", sortOrder: 8, imageUrl: ilustracion("recuerdo-xv-anos") },
  { slug: "aromaticas", name: "Aromáticas", description: "Para todo el año: ámbar, lavanda, coco y eucalipto.", sortOrder: 9, imageUrl: ilustracion("ambar") },
  { slug: "velas", name: "Velas postre", description: "Velas con forma de postre, hechas a mano. No son comestibles.", sortOrder: 10, imageUrl: "/productos/vela-pastelito-fresas.webp" },
];

/** Categorías que ya no se usan (postres y demostraciones anteriores): se ocultan y sus productos se archivan. */
export const retiredCategories = [
  "pasteles", "pasteles-personalizados", "cupcakes", "donas", "galletas", "pan-dulce", "postres-especiales",
  "cajas-de-regalo", "paquetes-para-eventos", "promociones",
];

// ───────── Opciones reutilizables ─────────
const aroma: Opt = { name: "Aroma", type: "SINGLE", isRequired: true, values: [["Vainilla", 0], ["Fresa", 0], ["Chocolate", 0], ["Canela", 0], ["Sin aroma", 0]] };
const empaque: Opt = { name: "Presentación", type: "SINGLE", isRequired: true, values: [["Sin empaque", 0], ["Caja de regalo con moño", 35]] };
const tarjeta: Opt = { name: "Tarjeta con mensaje", type: "TEXT", maxLength: 120 };
const vela = [aroma, empaque, tarjeta];
const regalo = [empaque, tarjeta];

/** Recuerdos para eventos: se venden por paquete y se personalizan. */
const paquetes = (pieza: number): [string, number][] => [
  ["Paquete de 10", 0],
  ["Paquete de 25", Math.round(pieza * 25 * 0.95) - pieza * 10],
  ["Paquete de 50", Math.round(pieza * 50 * 0.9) - pieza * 10],
];
const nombreFecha: Opt = { name: "Nombre(s) y fecha para la etiqueta", type: "TEXT", isRequired: true, maxLength: 60 };
const liston = (colores: string[]): Opt => ({ name: "Color de listón", type: "SINGLE", isRequired: true, values: colores.map((c) => [c, 0]) });
const etiqueta: Opt = { name: "Etiqueta", type: "SINGLE", isRequired: true, values: [["Etiqueta impresa", 0], ["Etiqueta con foto", 4 * 10]] };
const indicaciones: Opt = { name: "Indicaciones (colores, temática, fecha del evento)", type: "TEXT", maxLength: 300 };
const recuerdo = (colores: string[]) => [nombreFecha, liston(colores), etiqueta, indicaciones];

export const products: CatalogProduct[] = [
  // ───── Navidad ─────
  { slug: "pino-nevado", name: "Pino nevado", category: "navidad", featured: true, price: 220, mode: "TRACKED", stock: 18, prep: 0, image: ilustracion("pino-nevado"),
    short: "Pino, menta y escarcha.",
    description: "Vela de pilar en cera de soya con aroma a pino fresco, menta y un toque de escarcha. Ideal para el centro de mesa navideño. Duración aproximada: 40 horas.",
    options: regalo },
  { slug: "ponche-navideno", name: "Ponche navideño", category: "navidad", featured: true, price: 190, mode: "TRACKED", stock: 20, prep: 0, image: ilustracion("ponche-navideno"),
    short: "Canela, guayaba y naranja.",
    description: "Vela en frasco de vidrio reutilizable con el aroma del ponche de la abuela: canela, guayaba, tejocote y naranja. Duración aproximada: 35 horas.",
    options: regalo },
  { slug: "galleta-de-jengibre", name: "Galleta de jengibre", category: "navidad", price: 180, mode: "TRACKED", stock: 15, prep: 0, image: ilustracion("galleta-de-jengibre"),
    short: "Jengibre, vainilla y azúcar morena.",
    description: "Vela de pilar color crema con hombrecito de jengibre y listón rojo. Aroma a galleta recién horneada.",
    options: regalo },
  { slug: "esfera-roja", name: "Vela estrella roja", category: "navidad", price: 160, sale: 139, mode: "TRACKED", stock: 24, prep: 0, image: ilustracion("esfera-roja"),
    short: "Manzana y canela, con estrella dorada.",
    description: "Vela de pilar roja con estrella dorada pintada a mano. Aroma a manzana horneada con canela. Precio especial de temporada.",
    options: regalo },
  { slug: "set-navideno-mini", name: "Set navideño de 3 mini velas", category: "navidad", featured: true, price: 390, mode: "TRACKED", stock: 10, prep: 0, image: ilustracion("set-navideno-mini"),
    short: "Pino, ponche y vainilla en caja de regalo.",
    description: "Tres mini velas en frasco (rojo, verde y dorado) con los aromas de la temporada, en caja de regalo. Perfecto para intercambios.",
    options: [tarjeta] },

  // ───── Amor y amistad ─────
  { slug: "frasco-te-quiero", name: "Frasco te quiero", category: "amor-y-amistad", featured: true, price: 210, mode: "TRACKED", stock: 16, prep: 0, image: ilustracion("frasco-te-quiero"),
    short: "Rosas, frambuesa y vainilla.",
    description: "Vela en frasco rosa con corazón rojo. Aroma a rosas con frambuesa y vainilla. Puedes agregar una tarjeta con tu mensaje.",
    options: regalo },
  { slug: "rosas-y-vainilla", name: "Pilar rosas y vainilla", category: "amor-y-amistad", price: 190, mode: "TRACKED", stock: 12, prep: 0, image: ilustracion("rosas-y-vainilla"),
    short: "Pilar rojo con corazón blanco.",
    description: "Vela de pilar roja con corazón pintado a mano y aroma a rosas y vainilla.",
    options: regalo },
  { slug: "set-amistad-mini", name: "Set amistad de 3 mini velas", category: "amor-y-amistad", price: 320, mode: "TRACKED", stock: 10, prep: 0, image: ilustracion("set-amistad-mini"),
    short: "Tres mini corazones para compartir.",
    description: "Tres mini velas en frasco con corazones, para regalar a tus amigas. Aromas: fresa, rosas y vainilla.",
    options: [tarjeta] },

  // ───── Día de muertos ─────
  { slug: "cempasuchil", name: "Vela cempasúchil", category: "dia-de-muertos", featured: true, price: 200, mode: "TRACKED", stock: 14, prep: 0, image: ilustracion("cempasuchil"),
    short: "Flor de cempasúchil y copal.",
    description: "Vela en frasco color cempasúchil con aroma floral y un toque de copal, para iluminar tu ofrenda.",
    options: regalo },
  { slug: "calaverita-de-azucar", name: "Calaverita de azúcar", category: "dia-de-muertos", price: 190, mode: "TRACKED", stock: 12, prep: 0, image: ilustracion("calaverita-de-azucar"),
    short: "Pilar morado con calaverita.",
    description: "Vela de pilar morada con calaverita de azúcar pintada a mano y aroma a vainilla y canela.",
    options: regalo },
  { slug: "pan-de-muerto", name: "Pan de muerto", category: "dia-de-muertos", price: 180, mode: "TRACKED", stock: 12, prep: 0, image: ilustracion("pan-de-muerto"),
    short: "Azahar, mantequilla y azúcar.",
    description: "Vela en frasco con el aroma del pan de muerto recién horneado: azahar, mantequilla y azúcar.",
    options: regalo },

  // ───── Halloween ─────
  { slug: "calabaza-especiada", name: "Calabaza especiada", category: "halloween", featured: true, price: 190, mode: "TRACKED", stock: 15, prep: 0, image: ilustracion("calabaza-especiada"),
    short: "Calabaza, canela y clavo.",
    description: "Vela de pilar negra con calabaza pintada a mano y aroma a pumpkin spice: calabaza, canela, nuez moscada y clavo.",
    options: regalo },
  { slug: "noche-de-brujas", name: "Noche de brujas", category: "halloween", price: 210, mode: "TRACKED", stock: 12, prep: 0, image: ilustracion("noche-de-brujas"),
    short: "Ciruela, pachuli y especias.",
    description: "Vela en frasco morado oscuro con luna dorada. Aroma misterioso a ciruela, pachuli y especias.",
    options: regalo },
  { slug: "fantasma-de-vainilla", name: "Fantasma de vainilla", category: "halloween", price: 170, mode: "TRACKED", stock: 15, prep: 0, image: ilustracion("fantasma-de-vainilla"),
    short: "Malvavisco y vainilla.",
    description: "Vela de pilar morada con fantasmita blanco. Aroma dulce a malvavisco y vainilla.",
    options: regalo },

  // ───── Bautizo ─────
  { slug: "vela-de-bautizo", name: "Vela de bautizo", category: "bautizo", featured: true, price: 480, mode: "MADE_TO_ORDER", prep: 120, image: ilustracion("vela-de-bautizo"),
    short: "Par de velas de ceremonia con cruz y moño.",
    description: "Par de velas cónicas blancas para la ceremonia, con cruz dorada, moño de listón y el nombre del bebé. Se elaboran sobre pedido.",
    options: [nombreFecha, liston(["Blanco", "Dorado", "Azul cielo", "Rosa palo"]), indicaciones] },
  { slug: "recuerdo-bautizo-mini", name: "Recuerdo de bautizo mini", category: "bautizo", featured: true, price: 350, mode: "MADE_TO_ORDER", prep: 168, image: ilustracion("recuerdo-bautizo-mini"),
    short: "Mini velas para tus invitados, desde $35 por pieza.",
    description: "Mini velas en frasco con cruz dorada y etiqueta con el nombre del bebé y la fecha. Se venden por paquete; para más de 50 piezas cotiza por WhatsApp.",
    variants: paquetes(35), options: recuerdo(["Blanco", "Dorado", "Azul cielo", "Rosa palo"]) },
  { slug: "frasco-bendicion", name: "Frasco bendición", category: "bautizo", price: 95, mode: "MADE_TO_ORDER", prep: 120, image: ilustracion("frasco-bendicion"),
    short: "Frasco mediano con cruz, para regalo especial.",
    description: "Vela en frasco mediano color marfil con cruz dorada, ideal para padrinos o mesa principal.",
    options: [nombreFecha, liston(["Blanco", "Dorado", "Azul cielo", "Rosa palo"])] },

  // ───── Baby shower ─────
  { slug: "frasco-oh-baby", name: "Frasco oh baby", category: "baby-shower", featured: true, price: 85, mode: "MADE_TO_ORDER", prep: 120, image: ilustracion("frasco-oh-baby"),
    short: "Huellitas en azul, rosa o neutro.",
    description: "Vela en frasco con huellitas de bebé y etiqueta personalizada. Elige el color de tu baby shower.",
    options: [{ name: "Color", type: "SINGLE", isRequired: true, values: [["Azul cielo", 0], ["Rosa", 0], ["Neutro (crema)", 0]] }, nombreFecha] },
  { slug: "recuerdo-huellitas-mini", name: "Recuerdo huellitas mini", category: "baby-shower", price: 320, mode: "MADE_TO_ORDER", prep: 168, image: ilustracion("recuerdo-huellitas-mini"),
    short: "Mini velas para invitados, desde $32 por pieza.",
    description: "Mini velas en frasco con huellitas y etiqueta con el nombre del bebé. Se venden por paquete.",
    variants: paquetes(32), options: recuerdo(["Rosa", "Azul cielo", "Amarillo pastel", "Blanco"]) },
  { slug: "pilar-baby-mono", name: "Pilar con moño", category: "baby-shower", price: 150, mode: "MADE_TO_ORDER", prep: 72, image: ilustracion("pilar-baby-mono"),
    short: "Vela de pilar para la mesa de regalos.",
    description: "Vela de pilar color vainilla con moño rosa, para decorar la mesa principal o la de regalos.",
    options: [liston(["Rosa", "Azul cielo", "Amarillo pastel"])] },

  // ───── Bodas ─────
  { slug: "vela-de-unidad", name: "Vela de unidad", category: "bodas", featured: true, price: 650, mode: "MADE_TO_ORDER", prep: 168, image: ilustracion("vela-de-unidad"),
    short: "Par de velas para la ceremonia, con anillos.",
    description: "Par de velas cónicas para el ritual de unidad, con anillos dorados, moño y los nombres de los novios con la fecha.",
    options: [nombreFecha, liston(["Marfil", "Dorado", "Champaña", "Verde salvia"]), indicaciones] },
  { slug: "recuerdo-boda-frasco", name: "Recuerdo de boda en frasco", category: "bodas", featured: true, price: 450, mode: "MADE_TO_ORDER", prep: 168, image: ilustracion("recuerdo-boda-frasco"),
    short: "Desde $45 por pieza, con sus iniciales.",
    description: "Velas en frasco con anillos dorados y etiqueta con las iniciales y la fecha de la boda. Se venden por paquete; para más de 50 piezas cotiza por WhatsApp.",
    variants: paquetes(45), options: recuerdo(["Marfil", "Dorado", "Champaña", "Verde salvia"]) },
  { slug: "pilar-iniciales", name: "Pilar con iniciales", category: "bodas", price: 280, mode: "MADE_TO_ORDER", prep: 120, image: ilustracion("pilar-iniciales"),
    short: "Para la mesa de honor.",
    description: "Vela de pilar marfil con ramita de olivo y las iniciales de los novios. Ideal para la mesa de honor.",
    options: [nombreFecha] },

  // ───── XV años y cumpleaños ─────
  { slug: "recuerdo-xv-anos", name: "Recuerdo de XV años", category: "xv-y-cumpleanos", featured: true, price: 90, mode: "MADE_TO_ORDER", prep: 120, image: ilustracion("recuerdo-xv-anos"),
    short: "Frasco con estrella dorada y su nombre.",
    description: "Vela en frasco en el color de la fiesta, con estrella dorada y etiqueta con el nombre de la quinceañera.",
    options: [{ name: "Color", type: "SINGLE", isRequired: true, values: [["Rosa", 0], ["Lila", 0], ["Azul", 0], ["Verde menta", 0]] }, nombreFecha] },
  { slug: "recuerdo-cumpleanos-mini", name: "Recuerdo de cumpleaños mini", category: "xv-y-cumpleanos", price: 300, mode: "MADE_TO_ORDER", prep: 120, image: ilustracion("recuerdo-cumpleanos-mini"),
    short: "Mini velas de colores, desde $30 por pieza.",
    description: "Mini velas en frasco en colores pastel, con estrella y etiqueta personalizada. Se venden por paquete.",
    variants: paquetes(30), options: recuerdo(["Rosa", "Azul", "Amarillo", "Multicolor"]) },

  // ───── Aromáticas ─────
  { slug: "ambar", name: "Ámbar", category: "aromaticas", featured: true, price: 180, mode: "TRACKED", stock: 20, prep: 0, image: ilustracion("ambar"),
    short: "Vainilla tostada y miel.",
    description: "Vela en frasco color ámbar con aroma cálido a vainilla tostada y miel. Duración aproximada: 35 horas.",
    options: regalo },
  { slug: "lavanda", name: "Lavanda", category: "aromaticas", price: 160, mode: "TRACKED", stock: 20, prep: 0, image: ilustracion("lavanda"),
    short: "Lavanda fresca y té blanco.",
    description: "Vela en frasco lila con aroma a lavanda fresca y té blanco. Relajante para la noche.",
    options: regalo },
  { slug: "coco-y-vainilla", name: "Coco y vainilla", category: "aromaticas", price: 160, mode: "TRACKED", stock: 18, prep: 0, image: ilustracion("coco-y-vainilla"),
    short: "Dulce y suave.",
    description: "Vela en frasco color crema con aroma a coco y vainilla.",
    options: regalo },
  { slug: "eucalipto-y-menta", name: "Eucalipto y menta", category: "aromaticas", price: 170, mode: "TRACKED", stock: 4, low: 5, prep: 0, image: ilustracion("eucalipto-y-menta"),
    short: "Fresca, para baño o estudio.",
    description: "Vela en frasco verde salvia con aroma a eucalipto y menta.",
    options: regalo },

  // ───── Velas postre (fotos de referencia) ─────
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
  { slug: "velas-pastel-corazon", name: "Set de velas pastel corazón", category: "amor-y-amistad", price: 420, sale: 359, mode: "TRACKED", stock: 4, prep: 0,
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
