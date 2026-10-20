from solution import stone_game_ix


def test_stone_game_ix_one_of_each():
    assert stone_game_ix([2, 1]) is True


def test_stone_game_ix_single_stone():
    assert stone_game_ix([2]) is False


def test_stone_game_ix_example_three():
    assert stone_game_ix([5, 1, 2, 4, 3]) is False


def test_stone_game_ix_only_multiples_of_three():
    assert stone_game_ix([3, 3]) is False


def test_stone_game_ix_even_zeros_mixed():
    assert stone_game_ix([1, 1, 2]) is True


def test_stone_game_ix_odd_zeros_lopsided():
    assert stone_game_ix([1, 1, 1, 1, 3]) is True


def test_stone_game_ix_odd_zeros_balanced():
    assert stone_game_ix([1, 2, 3]) is False
