-- MartX refund support: seed data
-- All dates are relative to NOW() so policy windows stay valid whenever the DB is created.
-- Run schema.sql first. Safe to re-run on an empty database only.

INSERT INTO customers (id, full_name, email, phone) VALUES
  (1,  'Adebayo Ogunleye',     'adebayo.ogunleye@example.com',     '+2348030000001'),
  (2,  'Folake Adeyemi',       'folake.adeyemi@example.com',       '+2348030000002'),
  (3,  'Tunde Bakare',         'tunde.bakare@example.com',         '+2348030000003'),
  (4,  'Yetunde Ajayi',        'yetunde.ajayi@example.com',        '+2348030000004'),
  (5,  'Olumide Akinwale',     'olumide.akinwale@example.com',     '+2348030000005'),
  (6,  'Funmilayo Ogunbanjo',  'funmilayo.ogunbanjo@example.com',  '+2348030000006'),
  (7,  'Babatunde Olatunji',   'babatunde.olatunji@example.com',   '+2348030000007'),
  (8,  'Omolara Fashola',      'omolara.fashola@example.com',      '+2348030000008'),
  (9,  'Kayode Adeleke',       'kayode.adeleke@example.com',       '+2348030000009'),
  (10, 'Temitope Olaniyan',    'temitope.olaniyan@example.com',    '+2348030000010'),
  (11, 'Segun Oyelaran',       'segun.oyelaran@example.com',       '+2348030000011'),
  (12, 'Bukola Adesina',       'bukola.adesina@example.com',       '+2348030000012'),
  (13, 'Damilola Ogundipe',    'damilola.ogundipe@example.com',    '+2348030000013'),
  (14, 'Ibukun Alabi',         'ibukun.alabi@example.com',         '+2348030000014'),
  (15, 'Seun Afolabi',         'seun.afolabi@example.com',         '+2348030000015');

SELECT setval('customers_id_seq', 15);

INSERT INTO orders (id, customer_id, status, order_date, delivered_at, refunded_at, total_amount) VALUES
  ('MX-1001', 1,  'delivered',  NOW() - INTERVAL '14 days',  NOW() - INTERVAL '10 days',  NULL,                        60.00),
  ('MX-1002', 2,  'delivered',  NOW() - INTERVAL '9 days',   NOW() - INTERVAL '5 days',   NULL,                        45.00),
  ('MX-1003', 3,  'delivered',  NOW() - INTERVAL '49 days',  NOW() - INTERVAL '45 days',  NULL,                       120.00),
  ('MX-1004', 4,  'delivered',  NOW() - INTERVAL '12 days',  NOW() - INTERVAL '8 days',   NULL,                       720.00),
  ('MX-1005', 5,  'delivered',  NOW() - INTERVAL '10 days',  NOW() - INTERVAL '6 days',   NULL,                        85.00),
  ('MX-1006', 6,  'refunded',   NOW() - INTERVAL '25 days',  NOW() - INTERVAL '20 days',  NOW() - INTERVAL '12 days',  38.00),
  ('MX-1007', 7,  'in_transit', NOW() - INTERVAL '3 days',   NULL,                        NULL,                        55.00),
  ('MX-1008', 8,  'delivered',  NOW() - INTERVAL '8 days',   NOW() - INTERVAL '4 days',   NULL,                        95.00),
  ('MX-1009', 10, 'delivered',  NOW() - INTERVAL '16 days',  NOW() - INTERVAL '12 days',  NULL,                       110.00),
  ('MX-1010', 11, 'delivered',  NOW() - INTERVAL '33 days',  NOW() - INTERVAL '29 days',  NULL,                        70.00),
  ('MX-1011', 12, 'delivered',  NOW() - INTERVAL '35 days',  NOW() - INTERVAL '31 days',  NULL,                        48.00),
  ('MX-1012', 13, 'delivered',  NOW() - INTERVAL '13 days',  NOW() - INTERVAL '9 days',   NULL,                       500.00),
  ('MX-1013', 14, 'delivered',  NOW() - INTERVAL '13 days',  NOW() - INTERVAL '9 days',   NULL,                       500.01),
  ('MX-1014', 15, 'delivered',  NOW() - INTERVAL '11 days',  NOW() - INTERVAL '7 days',   NULL,                        75.00),
  ('MX-1015', 1,  'delivered',  NOW() - INTERVAL '94 days',  NOW() - INTERVAL '90 days',  NULL,                        35.00),
  ('MX-1016', 2,  'delivered',  NOW() - INTERVAL '64 days',  NOW() - INTERVAL '60 days',  NULL,                        28.00),
  ('MX-1017', 9,  'delivered',  NOW() - INTERVAL '7 days',   NOW() - INTERVAL '3 days',   NULL,                        15.00),
  ('MX-1018', 15, 'refunded',   NOW() - INTERVAL '49 days',  NOW() - INTERVAL '45 days',  NOW() - INTERVAL '20 days',  40.00),
  ('MX-1019', 15, 'refunded',   NOW() - INTERVAL '59 days',  NOW() - INTERVAL '55 days',  NOW() - INTERVAL '35 days',  18.00),
  ('MX-1020', 3,  'delivered',  NOW() - INTERVAL '124 days', NOW() - INTERVAL '120 days', NULL,                        65.00),
  ('MX-1021', 12, 'delivered',  NOW() - INTERVAL '9 days',   NOW() - INTERVAL '5 days',   NULL,                        52.00);

INSERT INTO order_items (order_id, sku, name, quantity, unit_price, final_sale) VALUES
  ('MX-1001', 'MX-ADR-001', 'Adire Indigo Fabric (6 yards)',        1,  60.00, FALSE),
  ('MX-1002', 'MX-CLR-001', 'Clearance Suede Sneakers',             1,  45.00, TRUE),
  ('MX-1003', 'MX-ASO-001', 'Aso Oke Gele Set',                     1, 120.00, FALSE),
  ('MX-1004', 'MX-TEC-001', 'Ultrabook Laptop 15 inch',             1, 720.00, FALSE),
  ('MX-1005', 'MX-TEC-002', 'Bluetooth Speaker',                    1,  85.00, FALSE),
  ('MX-1006', 'MX-BTY-001', 'Shea Butter Gift Set',                 1,  38.00, FALSE),
  ('MX-1007', 'MX-ANK-001', 'Ankara Print Dress',                   1,  55.00, FALSE),
  ('MX-1008', 'MX-ACC-001', 'Leather Handbag',                      1,  95.00, FALSE),
  ('MX-1009', 'MX-ANK-020', 'Ankara Shirt',                         1,  90.00, FALSE),
  ('MX-1009', 'MX-CLR-004', 'Clearance Beaded Necklace',            1,  20.00, TRUE),
  ('MX-1010', 'MX-TEC-003', 'Wireless Earbuds',                     1,  70.00, FALSE),
  ('MX-1011', 'MX-ACC-002', 'Ankara Tote Bag',                      1,  48.00, FALSE),
  ('MX-1012', 'MX-TEC-004', 'Smart Watch',                          1, 500.00, FALSE),
  ('MX-1013', 'MX-TEC-005', 'Android Tablet',                       1, 500.01, FALSE),
  ('MX-1014', 'MX-ANK-030', 'Senator Kaftan',                       1,  75.00, FALSE),
  ('MX-1015', 'MX-ASO-002', 'Aso Oke Cap (Fila)',                   1,  35.00, FALSE),
  ('MX-1016', 'MX-ADR-002', 'Adire Scarf',                          1,  28.00, FALSE),
  ('MX-1017', 'MX-ACC-003', 'Phone Case',                           1,  15.00, FALSE),
  ('MX-1018', 'MX-FTW-001', 'Leather Sandals',                      1,  40.00, FALSE),
  ('MX-1019', 'MX-ACC-004', 'Ankara Face Cap',                      1,  18.00, FALSE),
  ('MX-1020', 'MX-ANK-040', 'Ankara Shirt (Long Sleeve)',           1,  65.00, FALSE),
  ('MX-1021', 'MX-ANK-050', 'Ankara Wrap Skirt',                    1,  52.00, FALSE);
