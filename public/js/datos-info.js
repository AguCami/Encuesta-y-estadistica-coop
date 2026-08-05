/*
 * Datos de referencia para la pantalla de Información útil: precios y
 * requisitos de los servicios, el directorio de internos y los lugares de
 * pago. Vienen de la planilla que usa mesa de informes; se editan acá.
 *
 * Los precios cambian: cuando haya lista nueva se actualiza este archivo.
 */

export const SERVICIOS = [
  {
    "titulo": "Agua Potable",
    "icono": "💧",
    "color": "color-agua",
    "etiquetas": "agua potable urbana rural conexion propietario dni escritura",
    "bloques": [
      {
        "titulo": "Precios de conexión",
        "precios": [
          [
            "Conexión Urbana",
            "$97.445,99"
          ],
          [
            "Conexión Rural",
            "$178.276,60"
          ],
          [
            "Materiales",
            "Consultar en el día"
          ],
          [
            "Derecho uso red (solo rural)",
            "$5.039,76"
          ],
          [
            "Quita de Cepo",
            "$11.789,59"
          ],
          [
            "Suscripción acciones de agua",
            "$20"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Requisitos (propietario)",
        "precios": [],
        "requisitos": [
          "Fotocopia del DNI",
          "Permiso municipal original",
          "Escritura / Boleto compraventa certificado por escribano"
        ]
      }
    ],
    "notas": []
  },
  {
    "titulo": "Energía Monofásica — Propietario",
    "icono": "⚡",
    "color": "color-energia",
    "etiquetas": "energia monofasica propietario familiar electricidad luz conexion dni escritura",
    "bloques": [
      {
        "titulo": "Precios",
        "precios": [
          [
            "Conexión",
            "$74.321,03"
          ],
          [
            "Traslado",
            "$74.321,03"
          ],
          [
            "Transferencia",
            "$74.321,03"
          ],
          [
            "Reconexión",
            "$11.335,22"
          ],
          [
            "Acciones Familia",
            "$12"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Requisitos",
        "precios": [],
        "requisitos": [
          "Fotocopia del DNI",
          "Escritura / Boleto compraventa certificado por escribano",
          "Certificado de instalación eléctrica apta (Ley Prov. N° 10281)",
          "Correo electrónico y celular de contacto"
        ]
      }
    ],
    "notas": [
      "Permiso municipal original (solo si es a estrenar).",
      "Declaración de potencia (a partir de la 3ra conexión en el mismo domicilio).",
      "Autorización con fotocopia del DNI."
    ]
  },
  {
    "titulo": "Energía Monofásica — Inquilino",
    "icono": "⚡",
    "color": "color-energia",
    "etiquetas": "energia monofasica inquilino familiar electricidad luz conexion alquiler garante",
    "bloques": [
      {
        "titulo": "Precios",
        "precios": [
          [
            "Conexión",
            "$74.321,03"
          ],
          [
            "Traslado",
            "$74.321,03"
          ],
          [
            "Transferencia",
            "$74.321,03"
          ],
          [
            "Reconexión",
            "$11.335,22"
          ],
          [
            "Acciones Familia",
            "$12"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Depósito en garantía",
        "precios": [
          [
            "Familiar",
            "$283.020,68"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Requisitos",
        "precios": [],
        "requisitos": [
          "Fotocopia del DNI",
          "Contrato de alquiler con firma del propietario (juez de paz o escribano)",
          "Certificado de instalación eléctrica apta (Ley Prov. N° 10281)",
          "Depósito en garantía o garante (titular de luz y propietario)",
          "Correo electrónico y celular de contacto"
        ]
      }
    ],
    "notas": [
      "Permiso municipal original (solo si es a estrenar).",
      "Declaración de potencia (a partir de la 3ra conexión en el mismo domicilio).",
      "Autorización con fotocopia del DNI.",
      "Forma de pago: conexión se abona al momento del trámite. Con depósito: 50% al inicio, el saldo en 2 cuotas en la boleta."
    ]
  },
  {
    "titulo": "Energía Monofásica — Comercial Propietario",
    "icono": "⚡",
    "color": "color-energia",
    "etiquetas": "energia monofasica comercial propietario electricidad luz conexion escritura arca",
    "bloques": [
      {
        "titulo": "Precios",
        "precios": [
          [
            "Conexión",
            "$74.321,03"
          ],
          [
            "Traslado",
            "$74.321,03"
          ],
          [
            "Transferencia",
            "$74.321,03"
          ],
          [
            "Reconexión",
            "$11.335,22"
          ],
          [
            "Acciones Comercio",
            "$16"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Requisitos",
        "precios": [],
        "requisitos": [
          "Fotocopia del DNI",
          "Escritura / Boleto compraventa certificado por escribano",
          "Certificado de instalación eléctrica apta (Ley Prov. N° 10281)",
          "Inscripción en ARCA",
          "Correo electrónico y celular de contacto"
        ]
      }
    ],
    "notas": [
      "Permiso municipal original (solo si es a estrenar).",
      "Declaración de potencia (a partir de la 3ra conexión en el mismo domicilio).",
      "Contrato social (solo si es una sociedad).",
      "Autorización con fotocopia del DNI."
    ]
  },
  {
    "titulo": "Energía Monofásica — Comercial Inquilino",
    "icono": "⚡",
    "color": "color-energia",
    "etiquetas": "energia monofasica comercial inquilino electricidad luz conexion alquiler garante arca",
    "bloques": [
      {
        "titulo": "Precios",
        "precios": [
          [
            "Conexión",
            "$74.321,03"
          ],
          [
            "Traslado",
            "$74.321,03"
          ],
          [
            "Transferencia",
            "$74.321,03"
          ],
          [
            "Reconexión",
            "$11.335,22"
          ],
          [
            "Acciones Comercio",
            "$16"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Depósito en garantía",
        "precios": [
          [
            "Hasta 10 KW",
            "$424.530,99"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Requisitos",
        "precios": [],
        "requisitos": [
          "Fotocopia del DNI",
          "Contrato de alquiler con firma del propietario (juez de paz o escribano)",
          "Certificado de instalación eléctrica apta (Ley Prov. N° 10281)",
          "Depósito en garantía o garante (titular de luz y propietario)",
          "Inscripción en ARCA",
          "Correo electrónico y celular de contacto"
        ]
      }
    ],
    "notas": [
      "Permiso municipal original (solo si es a estrenar).",
      "Contrato social (solo si es una sociedad).",
      "Declaración de potencia (a partir de la 3ra conexión en el mismo domicilio).",
      "Autorización con fotocopia del DNI.",
      "Forma de pago: conexión se abona al momento del trámite. Con depósito: 50% al inicio, el saldo en 2 cuotas en la boleta."
    ]
  },
  {
    "titulo": "Energía Trifásica — Propietario",
    "icono": "⚡",
    "color": "color-energia",
    "etiquetas": "energia trifasica propietario familiar electricidad luz conexion escritura arca potencia",
    "bloques": [
      {
        "titulo": "Precios",
        "precios": [
          [
            "Conexión Urbana",
            "$172.340,22"
          ],
          [
            "Conexión Rural",
            "$234.665,94"
          ],
          [
            "Traslado / Transferencia",
            "$172.340,22"
          ],
          [
            "Acciones Familia",
            "$12"
          ],
          [
            "Incremento capacidad (C/U 1)",
            "$130 (dólar oficial)"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Requisitos",
        "precios": [],
        "requisitos": [
          "Fotocopia del DNI",
          "Escritura / Boleto compraventa certificado por escribano",
          "Certificado de instalación eléctrica apta (Ley Prov. N° 10281)",
          "Declaración de potencia",
          "Correo electrónico y celular de contacto"
        ]
      }
    ],
    "notas": [
      "Permiso municipal original (solo si es a estrenar).",
      "Autorización con fotocopia del DNI."
    ]
  },
  {
    "titulo": "Energía Trifásica — Inquilino",
    "icono": "⚡",
    "color": "color-energia",
    "etiquetas": "energia trifasica inquilino familiar electricidad luz conexion alquiler garante arca",
    "bloques": [
      {
        "titulo": "Precios",
        "precios": [
          [
            "Conexión Urbana",
            "$172.340,22"
          ],
          [
            "Conexión Rural",
            "$234.665,94"
          ],
          [
            "Traslado / Transferencia",
            "$172.340,22"
          ],
          [
            "Acciones Familia",
            "$12"
          ],
          [
            "Incremento capacidad (C/U 1)",
            "$130 (dólar oficial)"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Depósito en garantía",
        "precios": [
          [
            "Hasta 10 KW",
            "$424.530,99"
          ],
          [
            "Más de 10 KW",
            "$566.041,33"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Requisitos",
        "precios": [],
        "requisitos": [
          "Fotocopia del DNI",
          "Contrato de alquiler con firma del propietario (juez de paz o escribano)",
          "Depósito en garantía o garante (titular de luz y propietario)",
          "Certificado de instalación eléctrica apta (Ley Prov. N° 10281)",
          "Declaración de potencia",
          "Correo electrónico y celular de contacto"
        ]
      }
    ],
    "notas": [
      "Permiso municipal original (solo si es a estrenar).",
      "Autorización con fotocopia del DNI.",
      "Forma de pago: conexión se abona al momento del trámite. Con depósito: 50% al inicio, el saldo en 2 cuotas en la boleta."
    ]
  },
  {
    "titulo": "Energía Trifásica — Comercial Propietario",
    "icono": "⚡",
    "color": "color-energia",
    "etiquetas": "energia trifasica comercial propietario electricidad luz conexion escritura arca potencia",
    "bloques": [
      {
        "titulo": "Precios",
        "precios": [
          [
            "Conexión Urbana",
            "$172.340,22"
          ],
          [
            "Conexión Rural",
            "$234.665,94"
          ],
          [
            "Traslado / Transferencia",
            "$172.340,22"
          ],
          [
            "Acciones Comercio",
            "$16"
          ],
          [
            "Incremento capacidad (C/U 1)",
            "$130 (dólar oficial)"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Requisitos",
        "precios": [],
        "requisitos": [
          "Fotocopia del DNI",
          "Escritura / Boleto compraventa certificado por escribano",
          "Certificado de instalación eléctrica apta (Ley Prov. N° 10281)",
          "Inscripción en ARCA",
          "Contrato social",
          "Declaración de potencia",
          "Correo electrónico y celular de contacto"
        ]
      }
    ],
    "notas": [
      "Permiso municipal original (solo si es a estrenar).",
      "Contrato social (solo si es una sociedad).",
      "Autorización con fotocopia del DNI."
    ]
  },
  {
    "titulo": "Energía Trifásica — Comercial Inquilino",
    "icono": "⚡",
    "color": "color-energia",
    "etiquetas": "energia trifasica comercial inquilino electricidad luz conexion alquiler garante arca",
    "bloques": [
      {
        "titulo": "Precios",
        "precios": [
          [
            "Conexión Urbana",
            "$172.340,22"
          ],
          [
            "Conexión Rural",
            "$234.665,94"
          ],
          [
            "Traslado / Transferencia",
            "$172.340,22"
          ],
          [
            "Acciones Comercio",
            "$16"
          ],
          [
            "Incremento capacidad (C/U 1)",
            "$130 (dólar oficial)"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Depósito en garantía",
        "precios": [
          [
            "Hasta 10 KW",
            "$424.530,99"
          ],
          [
            "Más de 10 KW",
            "$566.041,33"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Requisitos",
        "precios": [],
        "requisitos": [
          "Fotocopia del DNI",
          "Contrato de alquiler con firma del propietario (juez de paz o escribano)",
          "Depósito en garantía o garante (titular de luz y propietario)",
          "Certificado de instalación eléctrica apta (Ley Prov. N° 10281)",
          "Inscripción en ARCA",
          "Declaración de potencia",
          "Correo electrónico y celular de contacto"
        ]
      }
    ],
    "notas": [
      "Permiso municipal original (solo si es a estrenar).",
      "Contrato social (solo si es una sociedad).",
      "Autorización con fotocopia del DNI.",
      "Forma de pago: conexión se abona al momento del trámite. Con depósito: 50% al inicio, el saldo en 2 cuotas en la boleta."
    ]
  },
  {
    "titulo": "Internet GPON (Fibra) — Socio",
    "icono": "🌐",
    "color": "color-internet",
    "etiquetas": "internet fibra gpon velocidad mb conexion jubilados socio",
    "bloques": [
      {
        "titulo": "Conexión",
        "precios": [
          [
            "4 cuotas de $7.411,25",
            "$29.645"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Tarifas mensuales",
        "precios": [
          [
            "Hasta 10 Mb (jubilados)",
            "$7.230"
          ],
          [
            "Hasta 50 Mb",
            "$13.781,20"
          ],
          [
            "Hasta 100 Mb",
            "$20.657,87"
          ],
          [
            "Hasta 200 Mb",
            "$25.815,17"
          ],
          [
            "Hasta 600 Mb",
            "$39.280,31"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Requisitos (inquilinos sin energía)",
        "precios": [],
        "requisitos": [
          "DNI",
          "Contrato de alquiler con firma del propietario certificada",
          "Garante (titular del servicio de energía en la cooperativa)"
        ]
      }
    ],
    "notas": [
      "Pack SENSA: con 100 Mb o 50 Mb + TV, sin cargo adicional.",
      "Router en comodato. En caso de rotura o robo, responde el usuario. Permanencia mínima 1 año."
    ]
  },
  {
    "titulo": "Internet GPON (Fibra) — No Socio",
    "icono": "🌐",
    "color": "color-internet",
    "etiquetas": "internet fibra gpon velocidad mb conexion jubilados no asociado",
    "bloques": [
      {
        "titulo": "Conexión",
        "precios": [
          [
            "6 cuotas de $10.083,33",
            "$60.500"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Tarifas mensuales",
        "precios": [
          [
            "Hasta 100 Mb",
            "$20.657,87"
          ],
          [
            "Hasta 200 Mb",
            "$25.815,17"
          ],
          [
            "Hasta 600 Mb",
            "$39.280,31"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Requisitos (inquilinos sin energía)",
        "precios": [],
        "requisitos": [
          "DNI",
          "Contrato de alquiler con firma del propietario certificada"
        ]
      }
    ],
    "notas": [
      "Pack SENSA: con 100 Mb o 50 Mb + TV, sin cargo adicional.",
      "Router en comodato. En caso de rotura o robo, responde el usuario. Permanencia mínima 1 año."
    ]
  },
  {
    "titulo": "Internet Inalámbrico",
    "icono": "📡",
    "color": "color-internet",
    "etiquetas": "internet inalambrico wifi antena equipo topografia rural",
    "bloques": [
      {
        "titulo": "Tarifas mensuales",
        "precios": [
          [
            "Hasta 10 Mb",
            "$30.575"
          ],
          [
            "Hasta 20 Mb",
            "$43.215"
          ],
          [
            "Hasta 30 Mb",
            "$55.855"
          ],
          [
            "Hasta 60 Mb",
            "$71.350"
          ]
        ],
        "requisitos": []
      }
    ],
    "notas": [
      "Equipo: ~$310.000 financiado en 6 cuotas con interés. Instalación a cargo del usuario. Sujeto a topografía.",
      "Bonificación del 30% en el abono."
    ]
  },
  {
    "titulo": "Servicio IPTV (Televisión)",
    "icono": "📺",
    "color": "color-iptv",
    "etiquetas": "iptv television tv cable decodificador set top box android debito",
    "bloques": [
      {
        "titulo": "Instalación",
        "precios": [
          [
            "1 TV (aparato en comodato)",
            "$17.011,93"
          ],
          [
            "2 TV en adelante",
            "$150.000"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Abono mensual",
        "precios": [
          [
            "1 TV",
            "$12.159"
          ],
          [
            "2 TV",
            "$12.949"
          ],
          [
            "3 TV",
            "$15.791"
          ],
          [
            "4 TV",
            "$18.633"
          ],
          [
            "5 TV",
            "$21.475"
          ]
        ],
        "requisitos": []
      }
    ],
    "notas": [
      "Financiado hasta 6 cuotas con interés o contado. Gratis adhiriendo a débito automático.",
      "Pack SENSA: 100 Mb o 50 Mb + TV — sin cargo. Router y primer decodificador en comodato."
    ]
  },
  {
    "titulo": "Packs de TV",
    "icono": "📺",
    "color": "color-iptv",
    "etiquetas": "iptv television tv packs canales fox hbo futbol adultos dvr grabacion sensa",
    "bloques": [
      {
        "titulo": "Packs adicionales",
        "precios": [
          [
            "Grabación DVR",
            "$3.550"
          ],
          [
            "Pack Adultos",
            "$2.960"
          ],
          [
            "Pack Fox",
            "$7.180"
          ],
          [
            "Pack Fútbol",
            "$21.960"
          ],
          [
            "Pack HBO",
            "$8.400"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Packs Sensa",
        "precios": [
          [
            "Sensa Full",
            "$11.163,50"
          ]
        ],
        "requisitos": []
      }
    ],
    "notas": []
  },
  {
    "titulo": "Servicio de Teléfono",
    "icono": "☎",
    "color": "color-telefono",
    "etiquetas": "telefono linea fija mantenimiento conexion fibra",
    "bloques": [
      {
        "titulo": "Tarifas",
        "precios": [
          [
            "Conexión",
            "$1.220"
          ],
          [
            "Conexión solo teléfono (por fibra)",
            "$17.011,93"
          ],
          [
            "Mantenimiento Familiar",
            "$3.700"
          ],
          [
            "Mantenimiento Comercial",
            "$9.290"
          ]
        ],
        "requisitos": []
      }
    ],
    "notas": []
  },
  {
    "titulo": "Sepelio y Subsidio por Fallecimiento",
    "icono": "🤝",
    "color": "color-sepelio",
    "etiquetas": "sepelio subsidio fallecimiento beneficiario grupo familiar carencia",
    "bloques": [
      {
        "titulo": "Subsidio por Fallecimiento",
        "precios": [
          [
            "Costo",
            "Consultar"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Requisitos — Subsidio",
        "precios": [],
        "requisitos": [
          "DNI de uno o dos beneficiarios mayores de 18 años",
          "Firma del titular de la energía"
        ]
      },
      {
        "titulo": "Servicio de Sepelio",
        "precios": [
          [
            "Grupo familiar (matrimonio e hijos menores de 18)",
            "$5.000"
          ],
          [
            "Adicionales",
            "$2.500"
          ]
        ],
        "requisitos": []
      },
      {
        "titulo": "Requisitos — Sepelio",
        "precios": [],
        "requisitos": [
          "DNI de todos los integrantes del grupo familiar",
          "Libreta de familia / certificado de convivencia",
          "Firma del titular de la energía"
        ]
      }
    ],
    "notas": [
      "Período de carencia: 6 meses desde la contratación del servicio."
    ]
  }
];

export const INTERNOS = [
  {
    "sector": "Call Center",
    "num": "430",
    "nombre": "Call Center",
    "tel": "469430"
  },
  {
    "sector": "Call Center",
    "num": "431",
    "nombre": "Call Center",
    "tel": "469431"
  },
  {
    "sector": "Call Center",
    "num": "432",
    "nombre": "Call Center",
    "tel": "469432"
  },
  {
    "sector": "Agua Potable",
    "num": "144",
    "nombre": "Agua Potable",
    "tel": "469144"
  },
  {
    "sector": "Agua Potable",
    "num": "146",
    "nombre": "Agua Potable",
    "tel": "469146"
  },
  {
    "sector": "Automotor",
    "num": "143",
    "nombre": "Automotor (Nicolás Poggio)",
    "tel": "469143"
  },
  {
    "sector": "Automotor",
    "num": "350",
    "nombre": "Automotor - Taller Mecánico (Jorge Cabrera)",
    "tel": "445350"
  },
  {
    "sector": "Banco de Sangre",
    "num": "145",
    "nombre": "Banco de Sangre (Gabriela Fanin - Karina Cabuchi)",
    "tel": "469145"
  },
  {
    "sector": "Banco de Sangre",
    "num": "174",
    "nombre": "Banco de Sangre (Karina Cabuchi - Roxana Lecler)",
    "tel": "469174"
  },
  {
    "sector": "Cajas",
    "num": "127",
    "nombre": "Caja - Administración Central",
    "tel": "469127"
  },
  {
    "sector": "Cajas",
    "num": "164",
    "nombre": "Caja - Lote XV",
    "tel": "469164"
  },
  {
    "sector": "Cajas",
    "num": "179",
    "nombre": "Caja - Edificio La Caroyense",
    "tel": "469179"
  },
  {
    "sector": "Cajas",
    "num": "202",
    "nombre": "Caja - Edificio Sinsacate",
    "tel": "446202"
  },
  {
    "sector": "Cajas",
    "num": "341",
    "nombre": "Caja - Edificio Ruta 9",
    "tel": "445341"
  },
  {
    "sector": "Canal",
    "num": "301",
    "nombre": "Canal Coop",
    "tel": "445301"
  },
  {
    "sector": "Central Telefónica",
    "num": "165",
    "nombre": "Central Telefónica (Claudio Peschiutta)",
    "tel": "469165"
  },
  {
    "sector": "Central Telefónica",
    "num": "166",
    "nombre": "Central Telefónica (Gabriel Nieva)",
    "tel": "469166"
  },
  {
    "sector": "Central Telefónica",
    "num": "169",
    "nombre": "Central Telefónica (Germán Perlo)",
    "tel": "469169"
  },
  {
    "sector": "Central Telefónica",
    "num": "201",
    "nombre": "Central Telefónica - Edificio Sinsacate",
    "tel": "446201"
  },
  {
    "sector": "Cocinas",
    "num": "136",
    "nombre": "Cocina - Edificio Administrativo",
    "tel": "469136"
  },
  {
    "sector": "Cocinas",
    "num": "203",
    "nombre": "Cocina - Edificio Sinsacate",
    "tel": "446203"
  },
  {
    "sector": "Comercial",
    "num": "113",
    "nombre": "Cami Agustin",
    "tel": "469113"
  },
  {
    "sector": "Comercial",
    "num": "111",
    "nombre": "Comercial (Juan Peralta Ochos)",
    "tel": "469111"
  },
  {
    "sector": "Comercial",
    "num": "118",
    "nombre": "Comercial (Mónica Anzolini)",
    "tel": "469118"
  },
  {
    "sector": "Comercial",
    "num": "120",
    "nombre": "Comercial",
    "tel": "469120"
  },
  {
    "sector": "Comercial",
    "num": "123",
    "nombre": "Comercial (Ricardo Aris)",
    "tel": "469123"
  },
  {
    "sector": "Comercial",
    "num": "189",
    "nombre": "Comercial (Valeria Caverzacio)",
    "tel": "469189"
  },
  {
    "sector": "Comercial",
    "num": "190",
    "nombre": "Comercial",
    "tel": "469190"
  },
  {
    "sector": "Compras",
    "num": "106",
    "nombre": "Compras (Luis Monges)",
    "tel": "469106"
  },
  {
    "sector": "Compras",
    "num": "134",
    "nombre": "Compras (Eugenia Luna)",
    "tel": "469134"
  },
  {
    "sector": "Compras",
    "num": "135",
    "nombre": "Compras (Mariano Braida)",
    "tel": "469135"
  },
  {
    "sector": "Compras",
    "num": "137",
    "nombre": "Compras (Matías Strasorier)",
    "tel": "469137"
  },
  {
    "sector": "Consejo",
    "num": "104",
    "nombre": "Consejo - Vicepresidencia",
    "tel": "469104"
  },
  {
    "sector": "Consejo",
    "num": "107",
    "nombre": "Consejo - Presidencia",
    "tel": "469107"
  },
  {
    "sector": "Consejo",
    "num": "124",
    "nombre": "Consejo - Sala de Consejo",
    "tel": "469124"
  },
  {
    "sector": "Contaduría",
    "num": "115",
    "nombre": "Contaduría (Franco González - Ariel Stolzing)",
    "tel": "469115"
  },
  {
    "sector": "Contaduría",
    "num": "116",
    "nombre": "Contaduría (Maximiliano Agüero - Gastón Ponce)",
    "tel": "469116"
  },
  {
    "sector": "Depósito",
    "num": "178",
    "nombre": "Depósito Cocheras (Archivo General)",
    "tel": "469178"
  },
  {
    "sector": "Depósito",
    "num": "351",
    "nombre": "Fábrica de Postes",
    "tel": "445351"
  },
  {
    "sector": "Depósito",
    "num": "352",
    "nombre": "Depósito (Javier Bongiovanni)",
    "tel": "445352"
  },
  {
    "sector": "Depósito",
    "num": "370",
    "nombre": "Depósito (Martín Canalda - Héctor Basualdo)",
    "tel": "445370"
  },
  {
    "sector": "Gerencia",
    "num": "110",
    "nombre": "Gerencia",
    "tel": "469110"
  },
  {
    "sector": "Gerencia",
    "num": "188",
    "nombre": "Subgerencia (Cra. Laura Oliver)",
    "tel": "469188"
  },
  {
    "sector": "Guardia",
    "num": "149",
    "nombre": "Sala de Monitoreo La Caroyense",
    "tel": "469149"
  },
  {
    "sector": "Guardia",
    "num": "176",
    "nombre": "Guardia Edificio Administrativo (SEGUCOR)",
    "tel": "469176"
  },
  {
    "sector": "Guardia",
    "num": "349",
    "nombre": "Guardia - Edificio Ruta 9 (SEGUCOR)",
    "tel": "445349"
  },
  {
    "sector": "Herrería",
    "num": "348",
    "nombre": "Herrería",
    "tel": "445348"
  },
  {
    "sector": "Internet",
    "num": "154",
    "nombre": "Internet Mostrador",
    "tel": "469154"
  },
  {
    "sector": "Internet",
    "num": "168",
    "nombre": "Internet (Daniel Palacio)",
    "tel": "469168"
  },
  {
    "sector": "IPTV",
    "num": "181",
    "nombre": "Central Telefónica / GIS (César Sandoval)",
    "tel": "469181"
  },
  {
    "sector": "IPTV",
    "num": "182",
    "nombre": "IPTV / GIS (Sebastián Zaya)",
    "tel": "469182"
  },
  {
    "sector": "Mantenimiento Lab.",
    "num": "142",
    "nombre": "Mantenimiento Lab. - Inspector (Rodrigo Pettina)",
    "tel": "469142"
  },
  {
    "sector": "Mantenimiento Lab.",
    "num": "153",
    "nombre": "Mantenimiento Lab. (Martín Mena)",
    "tel": "469153"
  },
  {
    "sector": "Mantenimiento Lab.",
    "num": "197",
    "nombre": "Mantenimiento Lab. (Jorge Griguol)",
    "tel": "469197"
  },
  {
    "sector": "Oficina Técnica",
    "num": "183",
    "nombre": "Oficina Técnica (Mariano Grande)",
    "tel": "469183"
  },
  {
    "sector": "Oficina Técnica",
    "num": "184",
    "nombre": "Oficina Técnica (Fernando Peschiutta)",
    "tel": "469184"
  },
  {
    "sector": "Oficina Técnica",
    "num": "185",
    "nombre": "Oficina Técnica (Emiliano Cragnolini)",
    "tel": "469185"
  },
  {
    "sector": "Oficina Técnica",
    "num": "186",
    "nombre": "Oficina Técnica (Gino Chiarandini)",
    "tel": "469186"
  },
  {
    "sector": "Oficina Técnica",
    "num": "187",
    "nombre": "Oficina Técnica (Juan Hidaigo)",
    "tel": "469187"
  },
  {
    "sector": "Reclamos",
    "num": "119",
    "nombre": "Reclamos (Fernando Tipisky)",
    "tel": "469119"
  },
  {
    "sector": "Reclamos",
    "num": "126",
    "nombre": "Reclamos",
    "tel": "469126"
  },
  {
    "sector": "Redes",
    "num": "131",
    "nombre": "Redes (Mario Arlia)",
    "tel": "469131"
  },
  {
    "sector": "Redes",
    "num": "155",
    "nombre": "Redes - Guardia de Reclamos",
    "tel": "469155"
  },
  {
    "sector": "RRHH",
    "num": "108",
    "nombre": "RRHH (Exequiel Isasmendi)",
    "tel": "469108"
  },
  {
    "sector": "RRHH",
    "num": "140",
    "nombre": "RRHH (Claudio Roya)",
    "tel": "469140"
  },
  {
    "sector": "RRHH",
    "num": "141",
    "nombre": "RRHH (Mercedes Seculini - Gonzalo Nicolodi)",
    "tel": "469141"
  },
  {
    "sector": "Secretaría",
    "num": "102",
    "nombre": "Secretaría (Eduardo Cerutti)",
    "tel": "469102"
  },
  {
    "sector": "Secretaría",
    "num": "122",
    "nombre": "Secretaría (Pablo Antonietti - Aldo Gomez)",
    "tel": "469122"
  },
  {
    "sector": "Secretaría",
    "num": "125",
    "nombre": "Secretaría (Pablo Antonietti - Aldo Gomez)",
    "tel": "469125"
  },
  {
    "sector": "Secretaría",
    "num": "170",
    "nombre": "Secretaría (Pablo Antonietti - Aldo Gomez)",
    "tel": "469170"
  },
  {
    "sector": "Seguridad e Higiene",
    "num": "175",
    "nombre": "Seguridad e Higiene (Daniel Marini)",
    "tel": "469175"
  },
  {
    "sector": "Sistemas",
    "num": "157",
    "nombre": "Sistemas (Exequiel Torres - Franco Benítez)",
    "tel": "469157"
  },
  {
    "sector": "Sistemas",
    "num": "158",
    "nombre": "Sistemas (Pablo González)",
    "tel": "469158"
  },
  {
    "sector": "Sistemas",
    "num": "159",
    "nombre": "Sistemas (Gerardo Rui - Carlos Montes)",
    "tel": "469159"
  },
  {
    "sector": "Tablero",
    "num": "103",
    "nombre": "Tablero",
    "tel": "469103"
  },
  {
    "sector": "Tablero",
    "num": "150",
    "nombre": "Tablero",
    "tel": "469150"
  },
  {
    "sector": "Tesorería",
    "num": "109",
    "nombre": "Tesorería (Marcelo Rizzi)",
    "tel": "469109"
  },
  {
    "sector": "Tesorería",
    "num": "172",
    "nombre": "Tesorería (Sergio Peresotti - Sergio Sánchez)",
    "tel": "469172"
  },
  {
    "sector": "Ventas",
    "num": "113",
    "nombre": "Ventas",
    "tel": "469113"
  },
  {
    "sector": "Ventas",
    "num": "117",
    "nombre": "Ventas (Martín Ferreira)",
    "tel": "469117"
  },
  {
    "sector": "Ventas",
    "num": "161",
    "nombre": "Ventas",
    "tel": "469161"
  },
  {
    "sector": "Ventas",
    "num": "162",
    "nombre": "Ventas (Juan Peralta - Agustina Gutiérrez)",
    "tel": "469162"
  },
  {
    "sector": "Ventas",
    "num": "163",
    "nombre": "Ventas (Patricia Rizzi)",
    "tel": "469163"
  }
];

export const PAGOS = [
  {
    "zona": "Jesús María",
    "lugares": [
      {
        "nombre": "Farmacia Derma",
        "direccion": "Av. Miguel Juárez 1416"
      },
      {
        "nombre": "Farmacia Daniotti",
        "direccion": "V. Agüero 366 y Pedro J. Frías y Ameghino"
      },
      {
        "nombre": "Mariano Max (Western Union)",
        "direccion": "Ruta 9 y Ruta E66"
      },
      {
        "nombre": "Telecentro",
        "direccion": "Tucumán 401"
      },
      {
        "nombre": "Agencia 660",
        "direccion": "Tucumán 849"
      }
    ]
  },
  {
    "zona": "Colonia Caroya",
    "lugares": [
      {
        "nombre": "SYS Producciones",
        "direccion": "Don Bosco 3590, local 3"
      }
    ]
  },
  {
    "zona": "Sinsacate",
    "lugares": [
      {
        "nombre": "Farmacia Rossi",
        "direccion": "Av. Leopoldo Reyna 308"
      }
    ]
  }
];
