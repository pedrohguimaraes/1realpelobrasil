-- Candidatos iniciais (ajuste copy se quiser)

INSERT INTO candidates (id, name, photo_path, color_class, ring_class, min_cents, amount_presets, provocation, sort_order)
VALUES
  (
    'flavio',
    'Flávio Bolsonaro',
    '/flavio-bolsonaro.jpg',
    'text-blue-600',
    'ring-blue-400',
    100,
    ARRAY[100, 200, 500, 1000, 2000, 5000]::integer[],
    'Se a direita não vota, quem defende os seus valores?',
    0
  ),
  (
    'lula',
    'Lula',
    '/lula.jpg',
    'text-red-600',
    'ring-red-400',
    100,
    ARRAY[100, 200, 500, 1000, 2000, 5000]::integer[],
    'Se a esquerda não vota, quem ajuda quem mais precisa?',
    2
  ),
  (
    'isentao',
    'Nenhum dos dois',
    '/luciano-huck.png',
    'text-amber-600',
    'ring-amber-400',
    50,
    ARRAY[50, 100, 200, 500, 1000, 2000, 5000]::integer[],
    'O isentão também ajuda. Mas sem opinião.',
    1
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  photo_path = EXCLUDED.photo_path,
  color_class = EXCLUDED.color_class,
  ring_class = EXCLUDED.ring_class,
  min_cents = EXCLUDED.min_cents,
  amount_presets = EXCLUDED.amount_presets,
  provocation = EXCLUDED.provocation,
  sort_order = EXCLUDED.sort_order;
