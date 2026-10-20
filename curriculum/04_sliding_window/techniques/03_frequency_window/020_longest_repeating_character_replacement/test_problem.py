from solution import character_replacement


def test_character_replacement_single():
    assert character_replacement("A", 0) == 1


def test_character_replacement_normal():
    assert character_replacement("ABAB", 2) == 4


def test_character_replacement_normal_two():
    assert character_replacement("AABABBA", 1) == 4


def test_character_replacement_no_budget():
    assert character_replacement("ABBB", 0) == 3
