Ko imate izbranega mentorja in izbrano temo se lahko lotite raziskovanja. Preden pa začnete z implementiranjem ali eksperimentiranjem pa morate narediti pregled področja. Le na ta način boste videli kje in kako narediti ustrezne doprinose. Kakovosten pregled literature je torej temelj ne samo vsakega raziskovalnega projekta ampak tudi vsake dobre diplomske naloge. Da se v poplavi informacij ne izgubite, je priporočljivo upoštevati spodnje strukturirane korake.
Iskanje literature

Pri iskanju virov se ne zanašajte zgolj na splošne spletne iskalnike. Uporabite specializirane akademske baze in sodobna orodja, ki zagotavljajo preverjeno in strokovno vsebino:

    Google Scholar: Odlična vstopna točka za iskanje in hitro preverjanje števila citatov določenega članka.
    Računalniške podatkovne baze: Za področje računalništva in informatike sta najbolj relevantni knjižnici IEEE Xplore in ACM Digital Library.
    arXiv: Repozitorij prednatisov (pre-prints), kjer najdete najnovejše raziskave (predvsem s področja strojnega učenja in umetne inteligence), še preden so uradno objavljene.
    Napredna iskalna orodja v LLM-jih: Uporabite namenske "research" funkcije v velikih jezikovnih modelih za iskanje in sintezo ugotovitev. Pri tem je nujno kritično preverjanje, saj si modeli podatke ali vire včasih izmislijo.
    Iskanje po referencah (angl. Snowballing): Ko najdete en zelo dober in relevanten članek, poglejte, koga citira (pogled nazaj) in kdo vse citira ta članek (pogled naprej).

Shranjevanje in organizacija virov

Največja napaka, ki jo lahko naredite, je branje člankov brez sprotnega beleženja. Priporočamo, da si takoj na začetku ustvarite pregledno tabelo (v Excelu, Google Sheets, Notion ali podobnem orodju), ki naj vsebuje naslednje stolpce:

    Osnovni podatki: Naslov članka, avtorji in leto izdaje.
    Glavni doprinosi: Kaj so avtorji v članku sploh dosegli ali predlagali (v eni do dveh povedih)?
    Lastna opažanja in komentarji: Zakaj je ta članek pomemben za vašo diplomo? Kakšne so pomanjkljivosti njihove rešitve?
    BibTeX zapis: Ker se od vas pričakuje pisanje v sistemu LaTeX, je to edini smiselni način upravljanja z referencami. Obvezno si takoj kopirajte in shranite BibTeX zapis posameznega članka. Glavni razlog, da to storite že v fazi iskanja in branja, je ta, da vam kasneje ob samem pisanju ne bo treba znova iskati istih virov samo zato, da bi pridobili njihov citat.

Kako beremo znanstvene članke

Znanstvenih člankov ne beremo kot romane, od prve do zadnje strani. Pristop k branju mora biti taktičen, saj nam sicer zmanjka časa:

    Selekcija glede na ugled: Ugled revije ali konference je pogosto pomemben faktor pri odločitvi, ali boste članek sploh brali. Objave na priznanih konferencah (npr. CVPR, NeurIPS, ICSE, CHI) imajo praviloma višjo stopnjo zaupanja.
    Vrstni red branja:
        Najprej preberite povzetek (abstract), da vidite, ali je članek sploh relevanten.
        Nato si oglejte diagrame in slike, saj pogosto najbolje pojasnijo jedro predlagane rešitve.
        Nadaljujte z zaključkom in rezultati.
        Šele na koncu, če vas prepričajo rezultati, preberite metodologijo.
        Izjema: Če je članek izven vašega primarnega področja ekspertize, začnite z branjem uvoda in sorodnih del, saj ti poglavji postavita širši kontekst in pojasnita osnovne pojme.

Kako pravilno citiramo

Citiranje je obvezno vsakič, ko uporabite tujo idejo, ugotovitev, sliko ali besedilo. S tem se izognete plagiatorstvu in bralcu omogočite, da preveri vaše vire.

    Kdaj citiramo? Če navajate splošno znano dejstvo, citat ni potreben. Za specifične trditve pa morate obvezno navesti vir. Če ste v dvomih kam spada trditev, navedite vir.
    Neposredno navajanje vs. povzemanje: Neposredne prepise tujega besedila dajemo v narekovaje in zraven navedemo citat. Še bolje pa je, da prebrano preoblikujete s svojimi besedami in na koncu povedi dodate citat. Slednja opcija je v času LLMjev zelo preprosta.
    Pravilno citiranje v LaTeXu: Pred ukazom za citiranje obvezno uporabljamo tildo (~\cite{oznaka}) in ne običajnega presledka ( \cite{oznaka}). Tilda v LaTeXu predstavlja nedeljivi presledek (non-breaking space). To prepreči prelom vrstice tik pred citatom in zagotovi, da oznaka citata (npr. [1]) ne ostane osamljena v novi vrstici, ampak se vedno drži besede, na katero se nanaša.
