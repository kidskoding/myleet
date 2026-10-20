from solution import count_of_pairs


def test_count_of_pairs_shortcut_closes_triangle():
    assert count_of_pairs(3, 1, 3) == [6, 0, 0]


def test_count_of_pairs_shortcut_in_middle():
    assert count_of_pairs(5, 2, 4) == [10, 8, 2, 0, 0]


def test_count_of_pairs_shortcut_to_itself():
    assert count_of_pairs(4, 1, 1) == [6, 4, 2, 0]


def test_count_of_pairs_two_houses():
    assert count_of_pairs(2, 1, 2) == [2, 0]


def test_count_of_pairs_x_greater_than_y():
    assert count_of_pairs(7, 5, 2) == [14, 14, 10, 4, 0, 0, 0]


def test_count_of_pairs_tails_on_both_sides():
    assert count_of_pairs(8, 2, 6) == [16, 20, 14, 6, 0, 0, 0, 0]


def test_count_of_pairs_large_full_cycle():
    n = 10**5
    result = count_of_pairs(n, 1, n)
    assert result[0] == 2 * n
    assert result[n // 2 - 2] == 2 * n
    assert result[n // 2 - 1] == n
    assert not any(result[n // 2 :])
