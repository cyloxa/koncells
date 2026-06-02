import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { slugify } from "@/lib/utils";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Clean existing data ────────────────────────────
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
      categoryId: electronics.id,
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
      categoryId: electronics.id,
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
      categoryId: electronics.id,
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
      categoryId: electronics.id,
      images: [
        "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800",
      ],
    },
    // Clothing (3 products)
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
      categoryId: clothing.id,
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
      categoryId: clothing.id,
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
      categoryId: clothing.id,
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
      categoryId: home.id,
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
      categoryId: home.id,
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
      categoryId: home.id,
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

  console.log("\n🎉 Seeding complete!");
  console.log("   Admin login: admin@example.com / admin123");
  console.log("   User login:  john@example.com / user1234");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
