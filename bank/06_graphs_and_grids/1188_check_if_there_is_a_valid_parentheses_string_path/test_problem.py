from solution import has_valid_path


def test_has_valid_path_example_one():
    grid = [
        ["(", "(", "("],
        [")", "(", ")"],
        ["(", "(", ")"],
        ["(", "(", ")"],
    ]
    assert has_valid_path(grid) is True


def test_has_valid_path_example_two():
    grid = [[")", ")"], ["(", "("]]
    assert has_valid_path(grid) is False


def test_has_valid_path_two_by_two_odd_length_impossible():
    # Path length m+n-1 = 3 is odd, so no valid parentheses string exists.
    assert has_valid_path([["(", ")"], ["(", ")"]]) is False


def test_has_valid_path_single_open():
    assert has_valid_path([["("]]) is False


def test_has_valid_path_single_pair_row():
    assert has_valid_path([["(", ")"]]) is True


def test_has_valid_path_two_by_three():
    assert has_valid_path([["(", "(", ")"], [")", "(", ")"]]) is True
