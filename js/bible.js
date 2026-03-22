(function BibleModule() {
  'use strict';

  const BASE_URL    = 'https://raw.githubusercontent.com/aruljohn/Reina-Valera/main/';
  const CACHE_PFX   = 'bible_';

  // 66 libros del canon evangélico RVR1960
  // slugs = nombre exacto del archivo en el repositorio (sin .json)
  const BOOKS = [
    { name:'Génesis',         slug:'Génesis',          chapters:50  },
    { name:'Éxodo',           slug:'Éxodo',            chapters:40  },
    { name:'Levítico',        slug:'Levítico',          chapters:27  },
    { name:'Números',         slug:'Números',           chapters:36  },
    { name:'Deuteronomio',    slug:'Deuteronomio',      chapters:34  },
    { name:'Josué',           slug:'Josué',             chapters:24  },
    { name:'Jueces',          slug:'Jueces',            chapters:21  },
    { name:'Rut',             slug:'Rut',               chapters:4   },
    { name:'1 Samuel',        slug:'1 Samuel',          chapters:31  },
    { name:'2 Samuel',        slug:'2 Samuel',          chapters:24  },
    { name:'1 Reyes',         slug:'1 Reyes',           chapters:22  },
    { name:'2 Reyes',         slug:'2 Reyes',           chapters:25  },
    { name:'1 Crónicas',      slug:'1 Crónicas',        chapters:29  },
    { name:'2 Crónicas',      slug:'2 Crónicas',        chapters:36  },
    { name:'Esdras',          slug:'Ésdras',            chapters:10  },
    { name:'Nehemías',        slug:'Nehemías',          chapters:13  },
    { name:'Ester',           slug:'Ester',             chapters:10  },
    { name:'Job',             slug:'Job',               chapters:42  },
    { name:'Salmos',          slug:'Salmos',            chapters:150 },
    { name:'Proverbios',      slug:'Proverbios',        chapters:31  },
    { name:'Eclesiastés',     slug:'Eclesiástes',       chapters:12  },
    { name:'Cantares',        slug:'Cantares',          chapters:8   },
    { name:'Isaías',          slug:'Isaías',            chapters:66  },
    { name:'Jeremías',        slug:'Jeremías',          chapters:52  },
    { name:'Lamentaciones',   slug:'Lamentaciones',     chapters:5   },
    { name:'Ezequiel',        slug:'Ezequiel',          chapters:48  },
    { name:'Daniel',          slug:'Daniel',            chapters:12  },
    { name:'Oseas',           slug:'Oséas',             chapters:14  },
    { name:'Joel',            slug:'Joel',              chapters:3   },
    { name:'Amós',            slug:'Amós',              chapters:9   },
    { name:'Abdías',          slug:'Abdías',            chapters:1   },
    { name:'Jonás',           slug:'Jonás',             chapters:4   },
    { name:'Miqueas',         slug:'Miquéas',           chapters:7   },
    { name:'Nahúm',           slug:'Nahum',             chapters:3   },
    { name:'Habacuc',         slug:'Habacuc',           chapters:3   },
    { name:'Sofonías',        slug:'Sofonías',          chapters:3   },
    { name:'Hageo',           slug:'Aggeo',             chapters:2   },
    { name:'Zacarías',        slug:'Zacarías',          chapters:14  },
    { name:'Malaquías',       slug:'Malaquías',         chapters:4   },
    { name:'Mateo',           slug:'San Mateo',         chapters:28  },
    { name:'Marcos',          slug:'San Márcos',        chapters:16  },
    { name:'Lucas',           slug:'San Lúcas',         chapters:24  },
    { name:'Juan',            slug:'San Juan',          chapters:21  },
    { name:'Hechos',          slug:'Los Actos',         chapters:28  },
    { name:'Romanos',         slug:'Romanos',           chapters:16  },
    { name:'1 Corintios',     slug:'1 Corintios',       chapters:16  },
    { name:'2 Corintios',     slug:'2 Corintios',       chapters:13  },
    { name:'Gálatas',         slug:'Gálatas',           chapters:6   },
    { name:'Efesios',         slug:'Efesios',           chapters:6   },
    { name:'Filipenses',      slug:'Filipenses',        chapters:4   },
    { name:'Colosenses',      slug:'Colosenses',        chapters:4   },
    { name:'1 Tesalonicenses',slug:'1 Tesalonicenses',  chapters:5   },
    { name:'2 Tesalonicenses',slug:'2 Tesalonicenses',  chapters:3   },
    { name:'1 Timoteo',       slug:'1 Timoteo',         chapters:6   },
    { name:'2 Timoteo',       slug:'2 Timoteo',         chapters:4   },
    { name:'Tito',            slug:'Tito',              chapters:3   },
    { name:'Filemón',         slug:'Filemón',           chapters:1   },
    { name:'Hebreos',         slug:'Hebreos',           chapters:13  },
    { name:'Santiago',        slug:'Santiago',          chapters:5   },
    { name:'1 Pedro',         slug:'1 San Pedro',       chapters:5   },
    { name:'2 Pedro',         slug:'2 San Pedro',       chapters:3   },
    { name:'1 Juan',          slug:'1 San Juan',        chapters:5   },
    { name:'2 Juan',          slug:'2 San Juan',        chapters:1   },
    { name:'3 Juan',          slug:'3 San Juan',        chapters:1   },
    { name:'Judas',           slug:'San Júdas',         chapters:1   },
    { name:'Apocalipsis',     slug:'Revelación',        chapters:22  }
  ];

  window.BibleModule = {
    BOOKS,
    fetchBook,
    getVerse,
    findBookBySlug,
    findBookByName
  };

  async function fetchBook(slug) {
    const cached = sessionStorage.getItem(CACHE_PFX + slug);
    if (cached) {
      try { return JSON.parse(cached); } catch(e) { /* fallthrough */ }
    }
    const url = BASE_URL + encodeURIComponent(slug) + '.json';
    const res = await fetch(url);
    if (!res.ok) throw new Error('No se pudo cargar ' + slug);
    const data = await res.json();
    try { sessionStorage.setItem(CACHE_PFX + slug, JSON.stringify(data)); } catch(e) { /* storage full */ }
    return data;
  }

  async function getVerse(slug, chapterNum, verseNum) {
    const book    = await fetchBook(slug);
    const chapter = (book.chapters || book).find(c => Number(c.chapter) === Number(chapterNum));
    if (!chapter) throw new Error('Capítulo no encontrado');
    const verse = chapter.verses.find(v => Number(v.verse) === Number(verseNum));
    if (!verse) throw new Error('Versículo no encontrado');
    return verse.text;
  }

  function findBookBySlug(slug) {
    return BOOKS.find(b => b.slug.toLowerCase() === slug.toLowerCase()) || null;
  }

  function findBookByName(name) {
    return BOOKS.find(b => b.name.toLowerCase().includes(name.toLowerCase())) || null;
  }

})();
