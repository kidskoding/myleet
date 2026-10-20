from solution import most_profitable_path


def test_most_profitable_path_shared_gate():
    assert most_profitable_path([[0, 1], [1, 2], [1, 3], [3, 4]], 3, [-2, 4, 2, -4, 6]) == 6


def test_most_profitable_path_bob_takes_leaf():
    assert most_profitable_path([[0, 1]], 1, [-7280, 2350]) == -7280


def test_most_profitable_path_alice_reaches_root_first():
    assert most_profitable_path([[0, 1], [0, 2]], 1, [2, -4, 6]) == 8


def test_most_profitable_path_split_on_tie():
    assert most_profitable_path([[0, 1], [1, 2], [0, 3]], 2, [0, 10, -20, 4]) == 5


def test_most_profitable_path_meet_in_middle():
    assert most_profitable_path([[0, 1], [1, 2], [2, 3], [3, 4]], 4, [0, 0, 10, 0, 0]) == 5
