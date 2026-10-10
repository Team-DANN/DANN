from tools.fuzzy import normalize, resolve

PRODUCTS = [
    {"id": "p1", "name": "Croissant"},
    {"id": "p2", "name": "Chocolate Croissant"},
    {"id": "p3", "name": "Baguette"},
    {"id": "p4", "name": "Sourdough Loaf"},
]
MATERIALS = [
    {"id": "m1", "name": "All-Purpose Flour"},
    {"id": "m2", "name": "Bread Flour"},
    {"id": "m3", "name": "Butter"},
    {"id": "m4", "name": "Sugar"},
]


def test_normalize_drops_case_punctuation_and_plural_s():
    assert normalize("  Croissants! ") == "croissant"
    assert normalize("All-Purpose  Flour") == "all purpose flour"
    assert normalize("glass") == "glass"


def test_typo_resolves_to_the_right_item():
    r = resolve("croisant", PRODUCTS)
    assert r.status == "resolved"
    assert r.matches[0]["id"] == "p1"


def test_plural_resolves():
    r = resolve("baguettes", PRODUCTS)
    assert r.status == "resolved" and r.matches[0]["id"] == "p3"


def test_exact_name_beats_a_longer_name_that_contains_it():
    r = resolve("croissant", PRODUCTS)
    assert r.status == "resolved" and r.matches[0]["id"] == "p1"


def test_shared_word_is_ambiguous_and_lists_both():
    r = resolve("flour", MATERIALS)
    assert r.status == "ambiguous"
    assert {m["id"] for m in r.matches} == {"m1", "m2"}


def test_no_match_is_none():
    assert resolve("zzzzzz", MATERIALS).status == "none"


def test_blank_or_one_letter_is_none():
    assert resolve("", MATERIALS).status == "none"
    assert resolve("b", MATERIALS).status == "none"


def test_duplicate_names_are_ambiguous_not_a_guess():
    items = [{"id": "a", "name": "Butter"}, {"id": "b", "name": "Butter"}]
    assert resolve("butter", items).status == "ambiguous"


def test_at_most_four_candidates():
    items = [{"id": str(i), "name": f"Flour {i}"} for i in range(9)]
    assert len(resolve("flour", items).matches) <= 4