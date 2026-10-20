from solution import convert_to_title


def test_convert_to_title_single_letter():
    assert convert_to_title(1) == "A"


def test_convert_to_title_double_letter():
    assert convert_to_title(28) == "AB"


def test_convert_to_title_z():
    assert convert_to_title(26) == "Z"
