from solution import solve


def test_solve_surrounds_enclosed_region():
    board = [
        ["X", "X", "X", "X"],
        ["X", "O", "O", "X"],
        ["X", "X", "O", "X"],
        ["X", "O", "X", "X"],
    ]
    expected = [
        ["X", "X", "X", "X"],
        ["X", "X", "X", "X"],
        ["X", "X", "X", "X"],
        ["X", "O", "X", "X"],
    ]

    solve(board)

    assert board == expected


def test_solve_no_enclosed_region():
    board = [["O", "O"], ["O", "O"]]

    solve(board)

    assert board == [["O", "O"], ["O", "O"]]
