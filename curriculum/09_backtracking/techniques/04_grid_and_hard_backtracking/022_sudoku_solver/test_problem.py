from solution import solve_sudoku


def test_solve_sudoku_solves_in_place():
    board = [
        ["5", "3", ".", ".", "7", ".", ".", ".", "."],
        ["6", ".", ".", "1", "9", "5", ".", ".", "."],
        [".", "9", "8", ".", ".", ".", ".", "6", "."],
        ["8", ".", ".", ".", "6", ".", ".", ".", "3"],
        ["4", ".", ".", "8", ".", "3", ".", ".", "1"],
        ["7", ".", ".", ".", "2", ".", ".", ".", "6"],
        [".", "6", ".", ".", ".", ".", "2", "8", "."],
        [".", ".", ".", "4", "1", "9", ".", ".", "5"],
        [".", ".", ".", ".", "8", ".", ".", "7", "9"],
    ]
    solve_sudoku(board)
    assert all("." not in row for row in board)


def test_solve_sudoku_fills_every_cell_validly():
    board = [
        list(row)
        for row in [
            "53..7....",
            "6..195...",
            ".98....6.",
            "8...6...3",
            "4..8.3..1",
            "7...2...6",
            ".6....28.",
            "...419..5",
            "....8..79",
        ]
    ]
    solve_sudoku(board)

    assert all(len({c for c in row}) == 9 for row in board)
    assert all(len({board[r][c] for r in range(9)}) == 9 for c in range(9))
    assert all(
        len({board[r][c] for r in range(br, br + 3) for c in range(bc, bc + 3)}) == 9 for br in (0, 3, 6) for bc in (0, 3, 6)
    )


def test_solve_sudoku_keeps_the_given_clues():
    board = [
        list(row)
        for row in [
            "53..7....",
            "6..195...",
            ".98....6.",
            "8...6...3",
            "4..8.3..1",
            "7...2...6",
            ".6....28.",
            "...419..5",
            "....8..79",
        ]
    ]
    solve_sudoku(board)

    assert "".join(board[0]) == "534678912"
