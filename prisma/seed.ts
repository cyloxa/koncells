import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { slugify } from "@/lib/utils";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Clean existing data (respect FK order) ─────────
  await prisma.warehousePackageItem.deleteMany();
  await prisma.warehousePackage.deleteMany();
  await prisma.warehouseShipment.deleteMany();
  await prisma.preOrderItem.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.supplierProduct.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.relatedProduct.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.exchangeRate.deleteMany();
  await prisma.imageSettings.deleteMany();
  await prisma.seoSettings.deleteMany();
  await prisma.brandSetting.deleteMany();

  // ─── Create admin user ──────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@example.com",
      phone: "+1 (555) 000-0001",
      location: "Colombo, Sri Lanka",
      socialLinks: "WhatsApp: +15550000001\nLinkedIn: /in/admin-user",
      additionalNotes: "Super admin account for store management.",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // ─── Create demo user ───────────────────────────────
  const userPassword = await bcrypt.hash("user1234", 10);
  const user = await prisma.user.create({
    data: {
      name: "John Doe",
      email: "john@example.com",
      phone: "+1 (555) 123-4567",
      location: "Kandy, Sri Lanka",
      socialLinks: "Instagram: @johndoe\nFacebook: johndoe",
      additionalNotes: "Prefers WhatsApp for communication.",
      password: userPassword,
      role: "USER",
    },
  });
  console.log(`✅ Demo user created: ${user.email}`);

  // ─── Create categories ──────────────────────────────
  const electronics = await prisma.category.create({
    data: {
      name: "Electronics",
      slug: "electronics",
      description: "Cutting-edge gadgets, audio gear, and smart devices.",
      image: "https://images.unsplash.com/photo-1498049794561-7780e723166d?w=800",
    },
  });

  const clothing = await prisma.category.create({
    data: {
      name: "Clothing",
      slug: "clothing",
      description: "Modern apparel for every occasion.",
      image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800",
    },
  });

  const home = await prisma.category.create({
    data: {
      name: "Home & Living",
      slug: "home-living",
      description: "Beautiful furnishings and decor for your space.",
      image: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800",
    },
  });

  // ─── Create subcategories ──────────────────────────
  const headphones = await prisma.category.create({
    data: {
      name: "Headphones & Audio",
      slug: "headphones-audio",
      description: "Premium headphones, earbuds, and audio accessories.",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
      parentId: electronics.id,
    },
  });

  const monitors = await prisma.category.create({
    data: {
      name: "Monitors & Displays",
      slug: "monitors-displays",
      description: "High-resolution monitors and displays for work and play.",
      image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800",
      parentId: electronics.id,
    },
  });

  const keyboards = await prisma.category.create({
    data: {
      name: "Keyboards & Mice",
      slug: "keyboards-mice",
      description: "Mechanical keyboards, gaming mice, and input devices.",
      image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800",
      parentId: electronics.id,
    },
  });

  const speakers = await prisma.category.create({
    data: {
      name: "Speakers",
      slug: "speakers",
      description: "Portable and home speakers for every setting.",
      image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800",
      parentId: electronics.id,
    },
  });

  const shirts = await prisma.category.create({
    data: {
      name: "Shirts",
      slug: "shirts",
      description: "Classic and modern shirts for any occasion.",
      image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800",
      parentId: clothing.id,
    },
  });

  const pants = await prisma.category.create({
    data: {
      name: "Pants & Chinos",
      slug: "pants-chinos",
      description: "Comfortable pants and chinos for casual and formal wear.",
      image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800",
      parentId: clothing.id,
    },
  });

  const sweaters = await prisma.category.create({
    data: {
      name: "Sweaters & Knitwear",
      slug: "sweaters-knitwear",
      description: "Warm and stylish sweaters for every season.",
      image: "https://images.unsplash.com/photo-1434389677669-e08b4cda3a20?w=800",
      parentId: clothing.id,
    },
  });

  const furniture = await prisma.category.create({
    data: {
      name: "Furniture",
      slug: "furniture",
      description: "Modern furniture pieces for every room.",
      image: "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=800",
      parentId: home.id,
    },
  });

  const decor = await prisma.category.create({
    data: {
      name: "Decor & Accents",
      slug: "decor-accents",
      description: "Decorative items and accents to personalize your space.",
      image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800",
      parentId: home.id,
    },
  });

  console.log("✅ Categories created: Electronics (4 sub), Clothing (3 sub), Home & Living (2 sub)");

  console.log("✅ Categories created: Electronics, Clothing, Home & Living");

  // ─── Create products ────────────────────────────────
  const products = [
    // Electronics (4 products)
    {
      name: "Wireless Noise-Cancelling Headphones",
      slug: "wireless-noise-cancelling-headphones",
      description:
        "Premium over-ear headphones with active noise cancellation, 30-hour battery life, and ultra-comfortable memory foam ear cushions. Features Bluetooth 5.3 with multipoint connection and Hi-Res Audio support.",
      brand: "Sony",
      model: "WH-1000XM5",
      tags: "wireless, noise-cancelling, bluetooth, premium",
      weight: 0.25,
      price: 299.99,
      compareAtPrice: 349.99,
      globalPrice: 299.99,
      buyingPrice: 1800.00,
      competitorsPrice: 85000.00,
      shippingCost: 15.00,
      handlerCost: 5.00,
      stock: 50,
      isFeatured: true,
      isActive: true,
      sku: "ELEC-001",
      categoryId: headphones.id,
      images: [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
        "https://images.unsplash.com/photo-1487215078519-e21cc028cb29?w=800",
      ],
    },
    {
      name: "4K Ultra HD Smart Monitor 27\"",
      slug: "4k-ultra-hd-smart-monitor-27",
      description:
        "27-inch 4K UHD monitor with IPS panel, 99% sRGB, USB-C with 90W power delivery, built-in speakers, and adjustable ergonomic stand. Perfect for creative professionals.",
      brand: "Dell",
      model: "U2723QE",
      tags: "4k, monitor, professional, usb-c",
      weight: 6.5,
      price: 549.99,
      compareAtPrice: 649.99,
      globalPrice: 549.99,
      buyingPrice: 3300.00,
      competitorsPrice: 155000.00,
      shippingCost: 25.00,
      handlerCost: 10.00,
      stock: 25,
      isFeatured: true,
      isActive: true,
      sku: "ELEC-002",
      categoryId: monitors.id,
      images: [
        "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800",
        "https://images.unsplash.com/photo-1547119957-637f8679db1e?w=800",
      ],
    },
    {
      name: "Mechanical Gaming Keyboard RGB",
      slug: "mechanical-gaming-keyboard-rgb",
      description:
        "Full-size mechanical keyboard with Cherry MX Blue switches, per-key RGB backlighting, aircraft-grade aluminum frame, and dedicated media controls.",
      brand: "Logitech",
      model: "G Pro X",
      tags: "gaming, mechanical, rgb, keyboard",
      weight: 1.1,
      price: 129.99,
      compareAtPrice: null,
      globalPrice: 129.99,
      buyingPrice: 780.00,
      competitorsPrice: 35000.00,
      shippingCost: 10.00,
      handlerCost: 3.00,
      stock: 75,
      isFeatured: false,
      isActive: true,
      sku: "ELEC-003",
      categoryId: keyboards.id,
      images: [
        "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800",
      ],
    },
    {
      name: "Portable Bluetooth Speaker",
      slug: "portable-bluetooth-speaker",
      description:
        "Compact, waterproof Bluetooth speaker with 360° sound, 20-hour battery, and built-in microphone. IP67 rated for outdoor adventures.",
      brand: "JBL",
      model: "Flip 6",
      tags: "portable, bluetooth, speaker, waterproof",
      weight: 0.55,
      price: 79.99,
      compareAtPrice: 99.99,
      globalPrice: 79.99,
      buyingPrice: 480.00,
      competitorsPrice: 22000.00,
      shippingCost: 8.00,
      handlerCost: 3.00,
      stock: 120,
      isFeatured: false,
      isActive: true,
      sku: "ELEC-004",
      categoryId: speakers.id,
      images: [
        "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800",
      ],
    },
    {
      name: "Classic Fit Cotton Oxford Shirt",
      slug: "classic-fit-cotton-oxford-shirt",
      description:
        "Timeless Oxford shirt crafted from 100% organic cotton with a button-down collar, chest pocket, and adjustable cuffs. Pre-washed for extra softness.",
      brand: "Ralph Lauren",
      model: "Classic Oxford",
      tags: "cotton, formal, classic, oxford",
      weight: 0.3,
      price: 69.99,
      compareAtPrice: null,
      globalPrice: 69.99,
      buyingPrice: 420.00,
      competitorsPrice: 18500.00,
      shippingCost: 5.00,
      handlerCost: 2.00,
      stock: 200,
      isFeatured: true,
      isActive: true,
      sku: "CLTH-001",
      categoryId: shirts.id,
      images: [
        "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800",
        "https://images.unsplash.com/photo-1598033129183-c4f50d736b10?w=800",
      ],
    },
    {
      name: "Slim Fit Stretch Chinos",
      slug: "slim-fit-stretch-chinos",
      description:
        "Modern slim-fit chinos in stretch cotton twill with a comfortable mid-rise waist. Features a hidden tech pocket and moisture-wicking finish.",
      brand: "Dockers",
      model: "Alpha Slim",
      tags: "chinos, stretch, casual, slim-fit",
      weight: 0.4,
      price: 89.99,
      compareAtPrice: 109.99,
      globalPrice: 89.99,
      buyingPrice: 540.00,
      competitorsPrice: 24000.00,
      shippingCost: 5.00,
      handlerCost: 2.00,
      stock: 150,
      isFeatured: false,
      isActive: true,
      sku: "CLTH-002",
      categoryId: pants.id,
      images: [
        "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800",
      ],
    },
    {
      name: "Merino Wool Crew Neck Sweater",
      slug: "merino-wool-crew-neck-sweater",
      description:
        "Luxuriously soft 100% Merino wool sweater with ribbed cuffs, hem, and a classic crew neckline. Temperature-regulating and naturally odor-resistant.",
      brand: "Uniqlo",
      model: "Merino Crew",
      tags: "wool, merino, sweater, crew-neck",
      weight: 0.35,
      price: 119.99,
      compareAtPrice: 149.99,
      globalPrice: 119.99,
      buyingPrice: 720.00,
      competitorsPrice: 32000.00,
      shippingCost: 5.00,
      handlerCost: 2.00,
      stock: 80,
      isFeatured: false,
      isActive: true,
      sku: "CLTH-003",
      categoryId: sweaters.id,
      images: [
        "https://images.unsplash.com/photo-1434389677669-e08b4cda3a20?w=800",
      ],
    },
    // Home & Living (3 products)
    {
      name: "Minimalist Ceramic Table Lamp",
      slug: "minimalist-ceramic-table-lamp",
      description:
        "Handcrafted ceramic table lamp with a matte white finish, linen shade, and warm LED bulb included. Features touch-activated dimming with three brightness levels.",
      brand: "IKEA",
      model: "Forsa",
      tags: "lamp, ceramic, minimalist, table",
      weight: 1.8,
      price: 149.99,
      compareAtPrice: null,
      globalPrice: 149.99,
      buyingPrice: 900.00,
      competitorsPrice: 42000.00,
      shippingCost: 12.00,
      handlerCost: 5.00,
      stock: 40,
      isFeatured: true,
      isActive: true,
      sku: "HOME-001",
      categoryId: furniture.id,
      images: [
        "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=800",
        "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800",
      ],
    },
    {
      name: "Organic Cotton Throw Blanket",
      slug: "organic-cotton-throw-blanket",
      description:
        "Ultra-soft organic cotton throw blanket in a herringbone weave. Measures 50\"x70\" — perfect for the sofa or end-of-bed layering. Machine washable.",
      brand: "Barefoot Dreams",
      model: "CozyChic Throw",
      tags: "blanket, cotton, organic, throw",
      weight: 0.9,
      price: 59.99,
      compareAtPrice: 79.99,
      globalPrice: 59.99,
      buyingPrice: 360.00,
      competitorsPrice: 16000.00,
      shippingCost: 8.00,
      handlerCost: 3.00,
      stock: 100,
      isFeatured: false,
      isActive: true,
      sku: "HOME-002",
      categoryId: decor.id,
      images: [
        "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800",
      ],
    },
    {
      name: "Scented Soy Candle Trio Set",
      slug: "scented-soy-candle-trio-set",
      description:
        "Set of three hand-poured soy wax candles in amber glass jars. Scents: Vanilla Bean, Cedar & Pine, and Fresh Linen. Each burns for 50+ hours.",
      brand: "Yankee Candle",
      model: "Signature Trio",
      tags: "candle, scented, soy, gift-set",
      weight: 1.2,
      price: 44.99,
      compareAtPrice: null,
      globalPrice: 44.99,
      buyingPrice: 270.00,
      competitorsPrice: 12000.00,
      shippingCost: 8.00,
      handlerCost: 3.00,
      stock: 60,
      isFeatured: false,
      isActive: true,
      sku: "HOME-003",
      categoryId: decor.id,
      images: [
        "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800",
      ],
    },
  ];

  for (const productData of products) {
    const { images, ...data } = productData;
    const product = await prisma.product.create({
      data: {
        ...data,
        images: {
          create: images.map((url, idx) => ({
            url,
            alt: `${data.name} image ${idx + 1}`,
            position: idx,
          })),
        },
      },
    });
    console.log(`✅ Product created: ${product.name}`);
  }

  // Create related products for first few electronics
  const allProductsForRelation = await prisma.product.findMany({ take: 4 });
  if (allProductsForRelation.length >= 2) {
    await prisma.relatedProduct.create({
      data: {
        productId: allProductsForRelation[0].id,
        relatedProductId: allProductsForRelation[1].id,
      },
    });
    console.log("✅ Related product link created");
  }

  // ─── Create sample reviews ──────────────────────────
  const allProducts = await prisma.product.findMany({ take: 5 });
  const reviewData = [
    { rating: 5, title: "Absolutely love it!", comment: "Exceeded all my expectations. The build quality is outstanding and it works perfectly." },
    { rating: 4, title: "Great value for money", comment: "Really solid product. Only minor gripe is the packaging could be better." },
    { rating: 5, title: "Perfect gift", comment: "Bought this as a gift and they were thrilled. Shipping was fast and the product is beautiful." },
    { rating: 4, title: "Good, not great", comment: "Works as advertised. A few small cosmetic flaws but overall happy with the purchase." },
    { rating: 5, title: "Highly recommend", comment: "This is my third purchase from this brand and they never disappoint. Outstanding quality." },
  ];

  for (let i = 0; i < allProducts.length; i++) {
    await prisma.review.create({
      data: {
        ...reviewData[i],
        userId: user.id,
        productId: allProducts[i].id,
      },
    });
  }
  console.log("✅ Sample reviews created");

  // ─── Brand Settings ────────────────────────────────
  await prisma.brandSetting.deleteMany();
  await prisma.brandSetting.create({
    data: {
      brandName: "Koncells",
      phone: "+1 (555) 000-0000",
      emails: "support@koncells.com\ninfo@koncells.com",
      address: "123 Business Avenue\nColombo, Sri Lanka",
    },
  });
  console.log("✅ Default brand settings created");

  // ─── SEO Settings ──────────────────────────────────
  await prisma.seoSettings.deleteMany();
  await prisma.seoSettings.create({
    data: { showInProductForm: true },
  });
  console.log("✅ Default SEO settings created (visible in product form)");

  // ─── Exchange Rates ────────────────────────────────
  await prisma.exchangeRate.deleteMany();
  await prisma.exchangeRate.create({
    data: { source: "CNY", target: "LKR", rate: 42.5000, isDefault: true },
  });
  await prisma.exchangeRate.create({
    data: { source: "USD", target: "LKR", rate: 305.0000, isDefault: true },
  });
  console.log("✅ Default exchange rates created");

  // ─── Brands ─────────────────────────────────────────
  await prisma.brand.deleteMany();
  const brandNames = [
    "Sony", "Dell", "Logitech", "JBL",
    "Ralph Lauren", "Dockers", "Uniqlo",
    "IKEA", "Barefoot Dreams", "Yankee Candle",
    "Apple", "Samsung", "LG", "Nike", "Adidas",
  ];
  for (const name of brandNames) {
    await prisma.brand.create({
      data: { name, slug: slugify(name) },
    });
  }
  console.log(`✅ ${brandNames.length} brands created`);

  // ─── Add more test users ────────────────────────────
  const customerPassword = await bcrypt.hash("test1234", 10);

  const alice = await prisma.user.create({
    data: {
      name: "Alice Perera",
      email: "alice@example.com",
      phone: "+94 77 123 4567",
      location: "Colombo, Sri Lanka",
      password: customerPassword,
      role: "USER",
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: "Bob Silva",
      email: "bob@example.com",
      phone: "+94 71 987 6543",
      location: "Galle, Sri Lanka",
      password: customerPassword,
      role: "USER",
    },
  });

  const charlie = await prisma.user.create({
    data: {
      name: "Charlie Fernando",
      email: "charlie@example.com",
      phone: "+94 76 555 1212",
      location: "Kandy, Sri Lanka",
      password: customerPassword,
      role: "USER",
    },
  });

  console.log("✅ 3 additional test users created");

  // ─── Addresses for users ────────────────────────────
  const userAddress = await prisma.address.create({
    data: {
      userId: user.id,
      label: "Home",
      line1: "42 Galle Road",
      city: "Kandy",
      state: "Central Province",
      postalCode: "20000",
      country: "LK",
      isDefault: true,
    },
  });

  const aliceAddress1 = await prisma.address.create({
    data: {
      userId: alice.id,
      label: "Home",
      line1: "15 Ward Place",
      city: "Colombo",
      state: "Western Province",
      postalCode: "00700",
      country: "LK",
      isDefault: true,
    },
  });

  const aliceAddress2 = await prisma.address.create({
    data: {
      userId: alice.id,
      label: "Office",
      line1: "88 Union Place",
      line2: "3rd Floor",
      city: "Colombo",
      state: "Western Province",
      postalCode: "00200",
      country: "LK",
    },
  });

  const bobAddress = await prisma.address.create({
    data: {
      userId: bob.id,
      label: "Home",
      line1: "27 Lighthouse Street",
      city: "Galle",
      state: "Southern Province",
      postalCode: "80000",
      country: "LK",
    },
  });

  console.log("✅ 4 addresses created");

  // ─── Sample Orders ──────────────────────────────────
  const allProductsForOrder = await prisma.product.findMany();

  // Order 1: John Doe — DELIVERED, 2 items
  const order1 = await prisma.order.create({
    data: {
      userId: user.id,
      status: "DELIVERED",
      subtotal: 369.98,
      shippingCost: 0,
      tax: 29.60,
      total: 399.58,
      isManualOrder: false,
      shippingAddressId: userAddress.id,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      productId: allProductsForOrder[0].id, // Wireless Headphones
      quantity: 1,
      price: 299.99,
    },
  });
  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      productId: allProductsForOrder[4].id, // Oxford Shirt
      quantity: 1,
      price: 69.99,
    },
  });

  // Order 2: Alice Perera — PROCESSING, 3 items (manual order with costs/profit)
  const order2 = await prisma.order.create({
    data: {
      userId: alice.id,
      status: "PROCESSING",
      subtotal: 759.97,
      shippingCost: 0,
      tax: 0,
      total: 759.97,
      totalCosts: 4860.00,
      totalProfit: 279.97,
      isManualOrder: true,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order2.id,
      productId: allProductsForOrder[1].id, // 4K Monitor
      quantity: 1,
      price: 549.99,
      costs: 3300.00,
      profit: 549.99 - 3300.00, // negative if costs > price — shows loss scenario
      basePrice: 3300.00,
    },
  });
  await prisma.orderItem.create({
    data: {
      orderId: order2.id,
      productId: allProductsForOrder[3].id, // Bluetooth Speaker
      quantity: 2,
      price: 79.99,
      costs: 480.00,
      profit: (79.99 - 480.00) * 2,
      basePrice: 480.00,
    },
  });
  await prisma.orderItem.create({
    data: {
      orderId: order2.id,
      productId: allProductsForOrder[6].id, // Merino Sweater
      quantity: 1,
      price: 119.99,
      costs: 720.00,
      profit: 119.99 - 720.00,
      basePrice: 720.00,
    },
  });

  // Order 3: Bob Silva — PENDING
  const order3 = await prisma.order.create({
    data: {
      userId: bob.id,
      status: "PENDING",
      subtotal: 129.99,
      shippingCost: 9.99,
      tax: 10.40,
      total: 150.38,
      isManualOrder: false,
      shippingAddressId: bobAddress.id,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order3.id,
      productId: allProductsForOrder[2].id, // Mechanical Keyboard
      quantity: 1,
      price: 129.99,
    },
  });

  // Order 4: Charlie Fernando — AWAITING_STOCK (pre-order scenario)
  const order4 = await prisma.order.create({
    data: {
      userId: charlie.id,
      status: "AWAITING_STOCK",
      subtotal: 299.99,
      shippingCost: 0,
      tax: 0,
      total: 299.99,
      isManualOrder: true,
      totalCosts: 1800.00,
      totalProfit: 299.99 - 1800.00,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
  });

  const order4Item = await prisma.orderItem.create({
    data: {
      orderId: order4.id,
      productId: allProductsForOrder[0].id, // Wireless Headphones
      quantity: 1,
      price: 299.99,
      costs: 1800.00,
      profit: 299.99 - 1800.00,
      basePrice: 1800.00,
    },
  });

  // Order 5: Charlie Fernando — CANCELLED
  const order5 = await prisma.order.create({
    data: {
      userId: charlie.id,
      status: "CANCELLED",
      subtotal: 44.99,
      shippingCost: 8.00,
      tax: 3.60,
      total: 56.59,
      isManualOrder: false,
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order5.id,
      productId: allProductsForOrder[9].id, // Soy Candle Trio
      quantity: 1,
      price: 44.99,
    },
  });

  // Order 6: John Doe — PREORDER (with pre-order items linked below)
  const order6 = await prisma.order.create({
    data: {
      userId: user.id,
      status: "PREORDER",
      subtotal: 149.99,
      shippingCost: 0,
      tax: 0,
      total: 149.99,
      isManualOrder: true,
      totalCosts: 900.00,
      totalProfit: 149.99 - 900.00,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      shippingAddressId: userAddress.id,
    },
  });

  const order6Item = await prisma.orderItem.create({
    data: {
      orderId: order6.id,
      productId: allProductsForOrder[7].id, // Ceramic Table Lamp
      quantity: 1,
      price: 149.99,
      costs: 900.00,
      profit: 149.99 - 900.00,
      basePrice: 900.00,
    },
  });

  console.log("✅ 6 sample orders created");

  // ─── Suppliers ──────────────────────────────────────
  const shenzhenTech = await prisma.supplier.create({
    data: {
      name: "Shenzhen Tech Electronics Co.",
      contact: "Mr. Li Wei, +86 755 8288 9000",
      email: "liwei@shenzhentech.cn",
      address: "12 Huaqiangbei Road, Futian District, Shenzhen, Guangdong, China",
      paymentTerms: "30% deposit, 70% before shipment. T/T",
      leadTimeDays: 25,
      notes: "Preferred supplier for audio equipment and consumer electronics. Minimum order: 100 units.",
    },
  });

  const guangzhouTextile = await prisma.supplier.create({
    data: {
      name: "Guangzhou Textile Imports Ltd.",
      contact: "Ms. Zhang Mei, +86 20 8765 4321",
      email: "mei.zhang@gztextile.cn",
      address: "88 Zhongshan Avenue, Tianhe District, Guangzhou, Guangdong, China",
      paymentTerms: "50% deposit, 50% on delivery. L/C accepted.",
      leadTimeDays: 35,
      notes: "Cotton and wool garments specialist. Good quality, consistent lead times.",
    },
  });

  const yiwuHomeGoods = await prisma.supplier.create({
    data: {
      name: "Yiwu Home & Decor Supply Co.",
      contact: "Mr. Wang Dong, +86 579 8555 1212",
      email: "wangdong@yiwuhome.cn",
      address: "3 Futian Road, Yiwu, Zhejiang, China",
      paymentTerms: "100% T/T before shipment. First order only.",
      leadTimeDays: 20,
      notes: "Ceramics, textiles, home decor. Good for small batch orders.",
    },
  });

  console.log("✅ 3 suppliers created");

  // ─── Supplier-Product Links ─────────────────────────
  await prisma.supplierProduct.create({
    data: {
      supplierId: shenzhenTech.id,
      productId: allProductsForOrder[0].id, // Headphones
      priceCny: 210.00,
      isPreferred: true,
    },
  });
  await prisma.supplierProduct.create({
    data: {
      supplierId: shenzhenTech.id,
      productId: allProductsForOrder[1].id, // Monitor
      priceCny: 950.00,
      isPreferred: true,
    },
  });
  await prisma.supplierProduct.create({
    data: {
      supplierId: shenzhenTech.id,
      productId: allProductsForOrder[2].id, // Keyboard
      priceCny: 85.00,
      isPreferred: false,
    },
  });
  await prisma.supplierProduct.create({
    data: {
      supplierId: shenzhenTech.id,
      productId: allProductsForOrder[3].id, // Speaker
      priceCny: 55.00,
    },
  });
  await prisma.supplierProduct.create({
    data: {
      supplierId: guangzhouTextile.id,
      productId: allProductsForOrder[4].id, // Oxford Shirt
      priceCny: 45.00,
      isPreferred: true,
    },
  });
  await prisma.supplierProduct.create({
    data: {
      supplierId: guangzhouTextile.id,
      productId: allProductsForOrder[5].id, // Chinos
      priceCny: 60.00,
      isPreferred: true,
    },
  });
  await prisma.supplierProduct.create({
    data: {
      supplierId: guangzhouTextile.id,
      productId: allProductsForOrder[6].id, // Sweater
      priceCny: 85.00,
    },
  });
  await prisma.supplierProduct.create({
    data: {
      supplierId: yiwuHomeGoods.id,
      productId: allProductsForOrder[7].id, // Table Lamp
      priceCny: 105.00,
      isPreferred: true,
    },
  });
  await prisma.supplierProduct.create({
    data: {
      supplierId: yiwuHomeGoods.id,
      productId: allProductsForOrder[8].id, // Throw Blanket
      priceCny: 40.00,
    },
  });
  await prisma.supplierProduct.create({
    data: {
      supplierId: yiwuHomeGoods.id,
      productId: allProductsForOrder[9].id, // Candle Trio
      priceCny: 28.00,
    },
  });

  console.log("✅ 10 supplier-product links created");

  // ─── Purchase Orders ────────────────────────────────
  const exchangeRateCny = await prisma.exchangeRate.findFirst({
    where: { source: "CNY", target: "LKR", isDefault: true },
  });
  const rateCny = exchangeRateCny ? Number(exchangeRateCny.rate) : 42.5;

  // PO 1: Shenzhen Tech — ORDERED, 3 items (headphones, monitors, speakers)
  const po1 = await prisma.purchaseOrder.create({
    data: {
      supplierId: shenzhenTech.id,
      supplierName: shenzhenTech.name,
      supplierContact: shenzhenTech.contact,
      status: "ORDERED",
      totalCny: 0, // will recalc
      exchangeRate: rateCny,
      totalLkr: 0, // will recalc
      notes: "Restock for Q3. Priority shipping requested.",
      orderedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    },
  });

  const po1Items = [
    { product: allProductsForOrder[0], qty: 50, priceCny: 210.00 }, // Headphones
    { product: allProductsForOrder[1], qty: 20, priceCny: 950.00 }, // Monitor
    { product: allProductsForOrder[3], qty: 100, priceCny: 55.00 }, // Speaker
  ];

  const po1CreatedItems = [];
  let po1TotalCny = 0;
  for (const item of po1Items) {
    const lineCny = item.priceCny * item.qty;
    po1TotalCny += lineCny;
    const created = await prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: po1.id,
        productId: item.product.id,
        productName: item.product.name,
        productSku: item.product.sku,
        quantity: item.qty,
        unitPriceCny: item.priceCny,
        lineTotalCny: lineCny,
        lineTotalLkr: lineCny * rateCny,
      },
    });
    po1CreatedItems.push(created);
  }
  await prisma.purchaseOrder.update({
    where: { id: po1.id },
    data: { totalCny: po1TotalCny, totalLkr: po1TotalCny * rateCny },
  });

  // PO 2: Guangzhou Textile — PENDING, 2 items
  const po2 = await prisma.purchaseOrder.create({
    data: {
      supplierId: guangzhouTextile.id,
      supplierName: guangzhouTextile.name,
      status: "PENDING",
      totalCny: 0,
      exchangeRate: rateCny,
      totalLkr: 0,
      notes: "New season stock.",
    },
  });

  const po2Items = [
    { product: allProductsForOrder[4], qty: 200, priceCny: 45.00 }, // Shirts
    { product: allProductsForOrder[5], qty: 150, priceCny: 60.00 }, // Chinos
  ];

  let po2TotalCny = 0;
  for (const item of po2Items) {
    const lineCny = item.priceCny * item.qty;
    po2TotalCny += lineCny;
    await prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: po2.id,
        productId: item.product.id,
        productName: item.product.name,
        productSku: item.product.sku,
        quantity: item.qty,
        unitPriceCny: item.priceCny,
        lineTotalCny: lineCny,
        lineTotalLkr: lineCny * rateCny,
      },
    });
  }
  await prisma.purchaseOrder.update({
    where: { id: po2.id },
    data: { totalCny: po2TotalCny, totalLkr: po2TotalCny * rateCny },
  });

  // PO 3: Yiwu Home — PARTIAL, 1 item (lamp, 20 received of 40)
  const po3 = await prisma.purchaseOrder.create({
    data: {
      supplierId: yiwuHomeGoods.id,
      supplierName: yiwuHomeGoods.name,
      status: "PARTIAL",
      totalCny: 0,
      exchangeRate: rateCny,
      totalLkr: 0,
      notes: "Split shipment — first batch arrived, second batch delayed.",
      orderedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    },
  });

  const po3Item = await prisma.purchaseOrderItem.create({
    data: {
      purchaseOrderId: po3.id,
      productId: allProductsForOrder[7].id, // Table Lamp
      productName: allProductsForOrder[7].name,
      productSku: allProductsForOrder[7].sku,
      quantity: 40,
      unitPriceCny: 105.00,
      lineTotalCny: 105.00 * 40,
      lineTotalLkr: 105.00 * 40 * rateCny,
      quantityReceived: 20,
    },
  });
  await prisma.purchaseOrder.update({
    where: { id: po3.id },
    data: {
      totalCny: 105.00 * 40,
      totalLkr: 105.00 * 40 * rateCny,
    },
  });

  // PO 4: Shenzhen Tech — RECEIVED, completed
  const po4 = await prisma.purchaseOrder.create({
    data: {
      supplierId: shenzhenTech.id,
      supplierName: shenzhenTech.name,
      status: "RECEIVED",
      totalCny: 0,
      exchangeRate: rateCny,
      totalLkr: 0,
      notes: "All items received and verified.",
      orderedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      receivedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
  });

  const po4Item = await prisma.purchaseOrderItem.create({
    data: {
      purchaseOrderId: po4.id,
      productId: allProductsForOrder[2].id, // Keyboard
      productName: allProductsForOrder[2].name,
      productSku: allProductsForOrder[2].sku,
      quantity: 100,
      unitPriceCny: 85.00,
      lineTotalCny: 85.00 * 100,
      lineTotalLkr: 85.00 * 100 * rateCny,
      quantityReceived: 100,
    },
  });
  await prisma.purchaseOrder.update({
    where: { id: po4.id },
    data: { totalCny: 85.00 * 100, totalLkr: 85.00 * 100 * rateCny },
  });

  console.log("✅ 4 purchase orders created");

  // ─── Link Pre-Order Items ──────────────────────────
  // Link order4 (Charlie — AWAITING_STOCK headphones) to PO1's headphone item
  await prisma.preOrderItem.create({
    data: {
      orderItemId: order4Item.id,
      purchaseOrderItemId: po1CreatedItems[0].id, // Headphones in PO1
      quantity: 1,
    },
  });

  // Link order6 (John — PREORDER table lamp) to PO3's lamp item
  await prisma.preOrderItem.create({
    data: {
      orderItemId: order6Item.id,
      purchaseOrderItemId: po3Item.id, // Lamp in PO3
      quantity: 1,
    },
  });

  console.log("✅ 2 pre-order items linked");

  // ─── Warehouse Shipments ───────────────────────────
  // Shipment 1: From PO3 (PARTIAL) — first 20 lamps delivered
  const shipment1 = await prisma.warehouseShipment.create({
    data: {
      purchaseOrderId: po3.id,
      status: "DELIVERED",
      totalWeight: 36.0, // 20 lamps × 1.8 kg each
      baseShippingCost: 150.00,
      extraCost: 25.00, // insurance
      totalShippingCost: 175.00,
      notes: "First partial shipment — 20 ceramic lamps.",
      packedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      shippedAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
  });

  const pkg1 = await prisma.warehousePackage.create({
    data: {
      warehouseShipmentId: shipment1.id,
      weight: 18.0,
      notes: "Box 1 of 2",
    },
  });
  await prisma.warehousePackageItem.create({
    data: {
      warehousePackageId: pkg1.id,
      purchaseOrderItemId: po3Item.id,
      quantity: 10,
    },
  });

  const pkg2 = await prisma.warehousePackage.create({
    data: {
      warehouseShipmentId: shipment1.id,
      weight: 18.0,
      notes: "Box 2 of 2",
    },
  });
  await prisma.warehousePackageItem.create({
    data: {
      warehousePackageId: pkg2.id,
      purchaseOrderItemId: po3Item.id,
      quantity: 10,
    },
  });

  // Shipment 2: From PO4 (RECEIVED) — keyboards
  const shipment2 = await prisma.warehouseShipment.create({
    data: {
      purchaseOrderId: po4.id,
      status: "DELIVERED",
      totalWeight: 110.0, // 100 keyboards × 1.1 kg each
      baseShippingCost: 400.00,
      extraCost: 50.00,
      totalShippingCost: 450.00,
      notes: "Full keyboard shipment.",
      packedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      shippedAt: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
  });

  const pkg3 = await prisma.warehousePackage.create({
    data: {
      warehouseShipmentId: shipment2.id,
      weight: 110.0,
      notes: "Bulk pallet — 100 units",
    },
  });
  await prisma.warehousePackageItem.create({
    data: {
      warehousePackageId: pkg3.id,
      purchaseOrderItemId: po4Item.id,
      quantity: 100,
    },
  });

  // Shipment 3: From PO1 (ORDERED) — in transit
  const shipment3 = await prisma.warehouseShipment.create({
    data: {
      purchaseOrderId: po1.id,
      status: "IN_TRANSIT",
      totalWeight: 77.5, // 50×0.25 + 20×6.5 + 100×0.55
      baseShippingCost: 350.00,
      extraCost: 30.00,
      totalShippingCost: 380.00,
      notes: "Mixed electronics shipment — tracking #SF123456789",
      packedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      shippedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  const pkg4 = await prisma.warehousePackage.create({
    data: {
      warehouseShipmentId: shipment3.id,
      weight: 12.5,
      notes: "Box 1: Headphones (50 units)",
    },
  });
  await prisma.warehousePackageItem.create({
    data: {
      warehousePackageId: pkg4.id,
      purchaseOrderItemId: po1CreatedItems[0].id,
      quantity: 50,
    },
  });

  const pkg5 = await prisma.warehousePackage.create({
    data: {
      warehouseShipmentId: shipment3.id,
      weight: 30.0,
      notes: "Box 2: Speakers (100 units)",
    },
  });
  await prisma.warehousePackageItem.create({
    data: {
      warehousePackageId: pkg5.id,
      purchaseOrderItemId: po1CreatedItems[2].id,
      quantity: 100,
    },
  });

  console.log("✅ 3 warehouse shipments with 5 packages created");

  // ─── Sample Carts ───────────────────────────────────
  // Cart for John Doe (existing user)
  const cartJohn = await prisma.cart.create({
    data: {
      userId: user.id,
    },
  });
  await prisma.cartItem.create({
    data: {
      cartId: cartJohn.id,
      productId: allProductsForOrder[3].id, // Bluetooth Speaker
      quantity: 1,
    },
  });
  await prisma.cartItem.create({
    data: {
      cartId: cartJohn.id,
      productId: allProductsForOrder[5].id, // Chinos
      quantity: 2,
    },
  });

  // Cart for Alice (empty — she already ordered)
  // Cart for Bob with items
  const cartBob = await prisma.cart.create({
    data: {
      userId: bob.id,
    },
  });
  await prisma.cartItem.create({
    data: {
      cartId: cartBob.id,
      productId: allProductsForOrder[8].id, // Throw Blanket
      quantity: 1,
    },
  });

  console.log("✅ 2 sample carts created");

  // ─── More Reviews for richer test data ──────────────
  const reviewUsers = [alice, bob, charlie];
  const additionalReviews = [
    { rating: 3, title: "Decent but overpriced", comment: "Works fine but not worth the full price. Wait for a sale." },
    { rating: 5, title: "Best purchase this year!", comment: "Incredible quality and fast shipping. Already ordered another one." },
    { rating: 4, title: "Nice design", comment: "Looks great in my living room. The material is high quality." },
    { rating: 2, title: "Not as described", comment: "Color was slightly different from the photo. Keeping it anyway." },
    { rating: 5, title: "Amazing value", comment: "Can't believe the quality at this price point. Highly recommended!" },
  ];

  for (let i = 0; i < additionalReviews.length; i++) {
    const productIdx = (i + 3) % allProducts.length; // different products
    await prisma.review.create({
      data: {
        ...additionalReviews[i],
        userId: reviewUsers[i % reviewUsers.length].id,
        productId: allProducts[productIdx].id,
      },
    });
  }
  console.log("✅ 5 additional reviews created");

  // ─── Image Settings ─────────────────────────────────
  await prisma.imageSettings.deleteMany();
  await prisma.imageSettings.create({
    data: {
      resizeEnabled: true,
      resizeWidth: 1200,
      resizeHeight: 1200,
      resizeFit: "inside",
      watermarkEnabled: true,
      watermarkText: "Koncells",
      watermarkOpacity: 0.5,
      watermarkSize: 48,
      watermarkPosition: "southeast",
      outputFormat: "webp",
      outputQuality: 85,
    },
  });
  console.log("✅ Image settings created");

  console.log("\n🎉 Seeding complete!");
  console.log("   Admin login:  admin@example.com / admin123");
  console.log("   User login:   john@example.com / user1234");
  console.log("   Customer 1:   alice@example.com / test1234");
  console.log("   Customer 2:   bob@example.com / test1234");
  console.log("   Customer 3:   charlie@example.com / test1234");
  console.log("");
  console.log("   ── Test Data Summary ──");
  console.log("   Users:             6 (1 admin + 5 customers)");
  console.log("   Categories:        12 (3 parent + 9 sub)");
  console.log("   Products:          10");
  console.log("   Reviews:           10 (5 + 5 additional)");
  console.log("   Orders:            6 (DELIVERED, PROCESSING, PENDING, AWAITING_STOCK, CANCELLED, PREORDER)");
  console.log("   Addresses:         4");
  console.log("   Suppliers:         3 (Shenzhen, Guangzhou, Yiwu)");
  console.log("   Supplier Products: 10");
  console.log("   Purchase Orders:   4 (ORDERED, PENDING, PARTIAL, RECEIVED)");
  console.log("   Pre-Order Items:   2");
  console.log("   Warehouse Ships:   3 (DELIVERED × 2, IN_TRANSIT × 1)");
  console.log("   Cart Samples:      2");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
