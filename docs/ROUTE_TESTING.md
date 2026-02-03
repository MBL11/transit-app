# Test de Comparaison des Itinéraires - İzmir Transit

Ce document contient les cas de test pour comparer les résultats de l'app avec Google Maps.

## Instructions

1. Ouvre l'app et va dans "Itinéraire"
2. Pour chaque test, entre les arrêts de départ et d'arrivée
3. Note le temps et le trajet proposé
4. Compare avec Google Maps (mêmes arrêts, même heure)
5. Marque ✅ si similaire (±10 min), ❌ si très différent, ⚠️ si pas de route

---

## TESTS JOUR (14:00)

### Test 1: Metro Direct - Fahrettin Altay → Konak
| Critère | Attendu (Google) | App |
|---------|------------------|-----|
| Durée | 10-15 min | ___ min |
| Route | M1 Metro direct | _______ |
| Statut | | ☐ |

### Test 2: Tram Direct - Alaybey → Hatay
| Critère | Attendu (Google) | App |
|---------|------------------|-----|
| Durée | 8-12 min | ___ min |
| Route | T1 Tram direct | _______ |
| Statut | | ☐ |

### Test 3: İZBAN Direct - Halkapınar → Alsancak
| Critère | Attendu (Google) | App |
|---------|------------------|-----|
| Durée | 5-10 min | ___ min |
| Route | İZBAN direct | _______ |
| Statut | | ☐ |

### Test 4: Ferry (Vapur) - Konak → Karşıyaka
| Critère | Attendu (Google) | App |
|---------|------------------|-----|
| Durée | 15-25 min | ___ min |
| Route | Vapur direct | _______ |
| Statut | | ☐ |

### Test 5: Metro + Marche - Üçyol → Alsancak
| Critère | Attendu (Google) | App |
|---------|------------------|-----|
| Durée | 15-25 min | ___ min |
| Route | M1 + marche | _______ |
| Statut | | ☐ |

### Test 6: İZBAN Long - Menemen → Halkapınar
| Critère | Attendu (Google) | App |
|---------|------------------|-----|
| Durée | 35-50 min | ___ min |
| Route | İZBAN direct | _______ |
| Statut | | ☐ |

### Test 7: Multi-modal - Bornova → Karşıyaka
| Critère | Attendu (Google) | App |
|---------|------------------|-----|
| Durée | 40-60 min | ___ min |
| Route | Metro + Ferry ou Bus | _______ |
| Statut | | ☐ |

### Test 8: İZBAN Long - Aliağa → Şirinyer
| Critère | Attendu (Google) | App |
|---------|------------------|-----|
| Durée | 60-80 min | ___ min |
| Route | İZBAN direct | _______ |
| Statut | | ☐ |

### Test 9: Centre-ville - Basmane → Çankaya
| Critère | Attendu (Google) | App |
|---------|------------------|-----|
| Durée | 5-15 min | ___ min |
| Route | Metro ou marche | _______ |
| Statut | | ☐ |

### Test 10: Cross-city - Buca → Mavişehir
| Critère | Attendu (Google) | App |
|---------|------------------|-----|
| Durée | 50-75 min | ___ min |
| Route | Bus + Metro/Tram | _______ |
| Statut | | ☐ |

---

## TESTS NUIT (02:30)

> Note: La nuit (1h-5h), seuls les bus Baykuş (910-950) circulent à İzmir.

### Test N1: Konak → Bornova (Bus de nuit)
| Critère | Attendu | App |
|---------|---------|-----|
| Durée | 25-45 min | ___ min |
| Route | Baykuş 910 ou similaire | _______ |
| Statut | | ☐ |

### Test N2: Konak → Buca (Bus de nuit)
| Critère | Attendu | App |
|---------|---------|-----|
| Durée | 30-50 min | ___ min |
| Route | Baykuş 920 ou similaire | _______ |
| Statut | | ☐ |

### Test N3: Alsancak → Karşıyaka (Bus de nuit)
| Critère | Attendu | App |
|---------|---------|-----|
| Durée | 25-40 min | ___ min |
| Route | Baykuş 930 ou similaire | _______ |
| Statut | | ☐ |

### Test N4: Konak → Çiğli (Bus de nuit)
| Critère | Attendu | App |
|---------|---------|-----|
| Durée | 40-60 min | ___ min |
| Route | Baykuş 940 ou similaire | _______ |
| Statut | | ☐ |

### Test N5: Fahrettin Altay → Üçkuyular (Nuit - pas de transport)
| Critère | Attendu | App |
|---------|---------|-----|
| Durée | Pas de transport | ___ min |
| Route | Marche ou "Aucun service" | _______ |
| Statut | | ☐ |

---

## Résumé des Tests

| Type | Total | ✅ OK | ❌ Échec | ⚠️ Pas de route |
|------|-------|-------|---------|-----------------|
| Jour | 10 | ___ | ___ | ___ |
| Nuit | 5 | ___ | ___ | ___ |
| **Total** | **15** | ___ | ___ | ___ |

## Notes

### Différences acceptables
- ±5 min pour trajets courts (<20 min)
- ±10 min pour trajets moyens (20-45 min)
- ±15 min pour trajets longs (>45 min)

### Problèmes connus
- Si "Aucun itinéraire trouvé" apparaît pour un trajet valide, les données GTFS manquent peut-être pour cette ligne
- Les temps d'attente peuvent varier (l'app utilise des moyennes)

### Comment signaler un problème
Note: départ, arrivée, heure, résultat app, résultat Google
