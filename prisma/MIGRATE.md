# Migração do banco de dados

O schema pode ter mudanças (enums, Decimal, índices). Rode **em ordem**:

## 1. Configurar `.env`

Garanta que `DATABASE_URL` no `.env` está com a connection string **real** do PostgreSQL (Supabase, Neon, etc.), por exemplo:

```
DATABASE_URL="postgresql://usuario:senha@host:5432/nome_do_banco?sslmode=require"
```

## 2. Desenvolvimento (gera arquivo de migração e aplica)

```bash
npm run db:migrate
```

Ou diretamente:

```bash
npx prisma migrate dev --name "enums-decimal-indexes"
```

## 3. Produção (só aplica migrações existentes)

```bash
npm run db:migrate:deploy
```

Ou:

```bash
npx prisma migrate deploy
```

---

## Atenção — mudanças de tipo comuns

- **Float → Decimal:** `Product.price`, `Order.subtotal/discount/deliveryFee/total`, `OrderItem.unitPrice`, `OrderItemAddon.price`, `Business.deliveryFee/minOrder`, `Coupon.value/minOrder`, `Expense.amount`, `ProductVariation.price`, `Addon.price`
- **String → Enum:** `User.role`, `Order.status/type/source/paymentMethod/paymentStatus`, `Table.status`, `OrderItem.status`, `StockMovement.type`, `Coupon.type`, `Expense.category`

O Prisma gera o SQL de conversão para PostgreSQL. **Revise o arquivo de migração em `prisma/migrations/` antes de aplicar em produção.**
