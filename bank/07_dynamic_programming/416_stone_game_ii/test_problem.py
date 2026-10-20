from solution import stone_game_ii


def test_stone_game_ii_example_one():
    assert stone_game_ii([2, 7, 9, 4, 4]) == 10


def test_stone_game_ii_example_two():
    assert stone_game_ii([1, 2, 3, 4, 5, 100]) == 104


def test_stone_game_ii_single_pile():
    assert stone_game_ii([5]) == 5


def test_stone_game_ii_take_all_two():
    assert stone_game_ii([1, 1]) == 2


def test_stone_game_ii_three_piles():
    # Alice can take at most two piles first; Bob then takes the last.
    assert stone_game_ii([1, 1, 10]) == 2
