from solution import check_valid


def test_check_valid_latin_square():
    assert check_valid([[1, 2, 3], [3, 1, 2], [2, 3, 1]]) is True


def test_check_valid_repeated_row_values():
    assert check_valid([[1, 1, 1], [1, 2, 3], [1, 2, 3]]) is False


def test_check_valid_single_cell():
    assert check_valid([[1]]) is True


def test_check_valid_rows_fine_columns_not():
    assert check_valid([[1, 2], [1, 2]]) is False


def test_check_valid_missing_number():
    assert check_valid([[2, 2], [2, 2]]) is False
