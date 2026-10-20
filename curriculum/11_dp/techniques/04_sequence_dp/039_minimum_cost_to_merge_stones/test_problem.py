from solution import merge_stones


def test_merge_stones_pairs():
    assert merge_stones([3, 2, 4, 1], 2) == 20


def test_merge_stones_impossible():
    assert merge_stones([3, 2, 4, 1], 3) == -1


def test_merge_stones_triples():
    assert merge_stones([3, 5, 1, 2, 6], 3) == 25
