# Comparaison Routes İzmir - Google Maps vs Notre App

## Sources utilisées
- [İzmir Metro M1 Wikipedia](https://en.wikipedia.org/wiki/M1_(%C4%B0zmir_Metro))
- [İzdeniz Ferry Official](https://www.izdeniz.com.tr/en/)
- [İZBAN Official](https://www.izban.com.tr/)
- [ESHOT Night Bus](https://www.eshot.gov.tr/en/NighBusServices/130/201)
- [Turkey Travel Planner](https://turkeytravelplanner.com/izmir-railway)
- [Moovit App](https://moovitapp.com/)

---

## TESTS JOUR (14:00)

| # | Trajet | Google/Source | Notre App Attendu | Statut |
|---|--------|---------------|-------------------|--------|
| 1 | **Fahrettin Altay → Konak** | 10-15 min (M1 direct, 6 arrêts) | 10-15 min | À tester |
| 2 | **Alaybey → Hatay** | 15-20 min (T1 + Metro transfer) | 15-25 min | À tester |
| 3 | **Halkapınar → Alsancak** | **6 min** (İZBAN direct) | 5-10 min | À tester |
| 4 | **Konak İskele → Karşıyaka İskele** | **20 min** (Vapur direct) | 15-25 min | À tester |
| 5 | **Üçyol → Alsancak** | 12-18 min (M1 → walk) | 15-20 min | À tester |
| 6 | **Menemen → Halkapınar** | 35-45 min (İZBAN direct) | 35-50 min | À tester |
| 7 | **Bornova → Karşıyaka** | 45-60 min (Metro + Ferry ou Bus) | 40-60 min | À tester |
| 8 | **Aliağa → Şirinyer** | 65-80 min (İZBAN, ~30 arrêts) | 60-80 min | À tester |
| 9 | **Basmane → Çankaya** | 3-5 min (M1 direct, 1 arrêt) | 3-8 min | À tester |
| 10 | **Buca → Mavişehir** | 55-70 min (Bus → Metro/Tram) | 50-75 min | À tester |

---

## TESTS NUIT (02:30)

> **Important**: La nuit (00:30-05:00), seuls les bus Baykuş circulent:
> - **910**: Gaziemir – Konak
> - **920**: Çiğli – Konak
> - **930**: Bornova – Konak
> - **940**: Buca – Konak
> - **950**: Narlıdere – Konak

| # | Trajet | Google/Source | Notre App Attendu | Statut |
|---|--------|---------------|-------------------|--------|
| N1 | **Konak → Bornova** | 25-40 min (Baykuş 930) | 25-45 min | À tester |
| N2 | **Konak → Buca** | 25-40 min (Baykuş 940) | 30-50 min | À tester |
| N3 | **Konak → Karşıyaka** | 30-45 min (Bus de nuit) | 25-45 min | À tester |
| N4 | **Konak → Çiğli** | 40-55 min (Baykuş 920) | 40-60 min | À tester |
| N5 | **Fahrettin Altay → Üçkuyular** | ❌ Pas de service | "Aucun service" ou marche | À tester |

---

## Données de référence İZBAN

| Trajet | Temps | Arrêts |
|--------|-------|--------|
| Alsancak → Halkapınar | 6 min | 1 |
| Halkapınar → Şirinyer | ~12 min | 3 |
| Menemen → Halkapınar | ~35 min | ~12 |
| Aliağa → Halkapınar | ~55 min | ~20 |
| Tepeköy → Aliağa (complet) | 92 min | 30 |

## Données de référence Metro M1

| Trajet | Temps | Arrêts |
|--------|-------|--------|
| Fahrettin Altay → Konak | 10-12 min | 6 |
| Konak → Basmane | 3-4 min | 2 |
| Basmane → Halkapınar | 5-6 min | 3 |
| Halkapınar → Bornova | 8-10 min | 4 |
| Bornova → Evka 3 | 6-8 min | 2 |
| **Total F.Altay → Evka 3** | ~47 min | 17 |

## Données de référence Ferry (Vapur)

| Trajet | Temps |
|--------|-------|
| Konak → Karşıyaka | 20 min |
| Konak → Bostanlı | 25 min |
| Üçkuyular → Bostanlı | 25 min |
| Fréquence heures de pointe | 15 min |

---

## Critères de validation

- ✅ **OK**: Différence ≤ 10 min du temps Google
- ⚠️ **Acceptable**: Différence 10-20 min
- ❌ **Échec**: Différence > 20 min ou route incorrecte

## Notes

1. Les temps Google incluent parfois l'attente, notre app montre le temps de trajet
2. Les correspondances ajoutent 5-8 min (marche + attente)
3. Le ferry a un temps d'attente moyen plus long (~8 min vs ~5 min bus)
