from solution import rotate_the_box


def test_rotate_the_box_single_row():
    assert rotate_the_box([["#", ".", "#"]]) == [["."], ["#"], ["#"]]


def test_rotate_the_box_with_obstacles():
    grid = [["#", ".", "*", "."], ["#", "#", "*", "."]]
    assert rotate_the_box(grid) == [["#", "."], ["#", "#"], ["*", "*"], [".", "."]]


def test_rotate_the_box_three_rows():
    grid = [
        ["#", "#", "*", ".", "*", "."],
        ["#", "#", "#", "*", ".", "."],
        ["#", "#", "#", ".", "#", "."],
    ]
    expected = [
        [".", "#", "#"],
        [".", "#", "#"],
        ["#", "#", "*"],
        ["#", "*", "."],
        ["#", ".", "*"],
        ["#", ".", "."],
    ]
    assert rotate_the_box(grid) == expected


def test_rotate_the_box_single_cell():
    assert rotate_the_box([["#"]]) == [["#"]]


def test_rotate_the_box_stones_stack_against_obstacle():
    assert rotate_the_box([["#", "#", ".", ".", "*"]]) == [["."], ["."], ["#"], ["#"], ["*"]]
