from solution import convert


def test_convert_three_rows():
    assert convert("PAYPALISHIRING", 3) == "PAHNAPLSIIGYIR"


def test_convert_four_rows():
    assert convert("PAYPALISHIRING", 4) == "PINALSIGYAHRPI"


def test_convert_single_char():
    assert convert("A", 1) == "A"


def test_convert_one_row_unchanged():
    assert convert("ABCD", 1) == "ABCD"


def test_convert_more_rows_than_chars():
    assert convert("AB", 5) == "AB"


def test_convert_two_rows():
    assert convert("ABCDE", 2) == "ACEBD"
