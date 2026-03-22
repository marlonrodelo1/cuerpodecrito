(function BibleModule() {
  'use strict';

  const BASE_URL    = 'https://raw.githubusercontent.com/aruljohn/Reina-Valera/master/rvr1960/';
  const CACHE_PFX   = 'bible_';

  // 66 libros del canon evangélico RVR1960
  const BOOKS = [
    { name:'Génesis',        slug:'Genesis',        chapters:50 },
    { name:'Éxodo',          slug:'Exodo',           chapters:40 },
    { name:'Levítico',       slug:'Levitico',        chapters:27 },
    { name:'Números',        slug:'Numeros',         chapters:36 },
    { name:'Deuteronomio',   slug:'Deuteronomio',    chapters:34 },
    { name:'Josué',          slug:'Josue',           chapters:24 },
    { name:'Jueces',         slug:'Jueces',          chapters:21 },
    { name:'Rut',            slug:'Rut',             chapters:4  },
    { name:'1 Samuel',       slug:'1Samuel',         chapters:31 },
    { name:'2 Samuel',       slug:'2Samuel',         chapters:24 },
    { name:'1 Reyes',        slug:'1Reyes',          chapters:22 },
    { name:'2 Reyes',        slug:'2Reyes',          chapters:25 },
    { name:'1 Crónicas',     slug:'1Cronicas',       chapters:29 },
    { name:'2 Crónicas',     slug:'2Cronicas',       chapters:36 },
    { name:'Esdras',         slug:'Esdras',          chapters:10 },
    { name:'Nehemías',       slug:'Nehemias',        chapters:13 },
    { name:'Ester',          slug:'Ester',           chapters:10 },
    { name:'Job',            slug:'Job',             chapters:42 },
    { name:'Salmos',         slug:'Salmos',          chapters:150 },
    { name:'Proverbios',     slug:'Proverbios',      chapters:31 },
    { name:'Eclesiastés',    slug:'Eclesiastes',     chapters:12 },
    { name:'Cantares',       slug:'Cantares',        chapters:8  },
    { name:'Isaías',         slug:'Isaias',          chapters:66 },
    { name:'Jeremías',       slug:'Jeremias',        chapters:52 },
    { name:'Lamentaciones',  slug:'Lamentaciones',   chapters:5  },
    { name:'Ezequiel',       slug:'Ezequiel',        chapters:48 },
    { name:'Daniel',         slug:'Daniel',          chapters:12 },
    { name:'Oseas',          slug:'Oseas',           chapters:14 },
    { name:'Joel',           slug:'Joel',            chapters:3  },
    { name:'Amós',           slug:'Amos',            chapters:9  },
    { name:'Abdías',         slug:'Abdias',          chapters:1  },
    { name:'Jonás',          slug:'Jonas',           chapters:4  },
    { name:'Miqueas',        slug:'Miqueas',         chapters:7  },
    { name:'Nahúm',          slug:'Nahum',           chapters:3  },
    { name:'Habacuc',        slug:'Habacuc',         chapters:3  },
    { name:'Sofonías',       slug:'Sofonias',        chapters:3  },
    { name:'Hageo',          slug:'Hageo',           chapters:2  },
    { name:'Zacarías',       slug:'Zacarias',        chapters:14 },
    { name:'Malaquías',      slug:'Malaquias',       chapters:4  },
    { name:'Mateo',          slug:'Mateo',           chapters:28 },
    { name:'Marcos',         slug:'Marcos',          chapters:16 },
    { name:'Lucas',          slug:'Lucas',           chapters:24 },
    { name:'Juan',           slug:'Juan',            chapters:21 },
    { name:'Hechos',         slug:'Hechos',          chapters:28 },
    { name:'Romanos',        slug:'Romanos',         chapters:16 },
    { name:'1 Corintios',    slug:'1Corintios',      chapters:16 },
    { name:'2 Corintios',    slug:'2Corintios',      chapters:13 },
    { name:'Gálatas',        slug:'Galatas',         chapters:6  },
    { name:'Efesios',        slug:'Efesios',         chapters:6  },
    { name:'Filipenses',     slug:'Filipenses',      chapters:4  },
    { name:'Colosenses',     slug:'Colosenses',      chapters:4  },
    { name:'1 Tesalonicenses',slug:'1Tesalonicenses',chapters:5 },
    { name:'2 Tesalonicenses',slug:'2Tesalonicenses',chapters:3 },
    { name:'1 Timoteo',      slug:'1Timoteo',        chapters:6  },
    { name:'2 Timoteo',      slug:'2Timoteo',        chapters:4  },
    { name:'Tito',           slug:'Tito',            chapters:3  },
    { name:'Filemón',        slug:'Filemon',         chapters:1  },
    { name:'Hebreos',        slug:'Hebreos',         chapters:13 },
    { name:'Santiago',       slug:'Santiago',        chapters:5  },
    { name:'1 Pedro',        slug:'1Pedro',          chapters:5  },
    { name:'2 Pedro',        slug:'2Pedro',          chapters:3  },
    { name:'1 Juan',         slug:'1Juan',           chapters:5  },
    { name:'2 Juan',         slug:'2Juan',           chapters:1  },
    { name:'3 Juan',         slug:'3Juan',           chapters:1  },
    { name:'Judas',          slug:'Judas',           chapters:1  },
    { name:'Apocalipsis',    slug:'Apocalipsis',     chapters:22 }
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
    const url = BASE_URL + slug + '.json';
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
