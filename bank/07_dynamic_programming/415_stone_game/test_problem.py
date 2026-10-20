from solution import stone_game


def test_stone_game_example():
    assert stone_game([5, 3, 4, 5]) is True


def test_stone_game_second_example():
    assert stone_game([3, 7, 2, 3]) is True


def test_stone_game_two_piles():
    assert stone_game([1, 2]) is True


def test_stone_game_big_middle():
    assert stone_game([1, 100, 1, 1]) is True


def test_stone_game_longer():
    assert stone_game([7, 8, 8, 10, 1, 2, 9, 4]) is True
