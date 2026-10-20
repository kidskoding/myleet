from solution import has_all_codes


def test_has_all_codes_example_true():
    assert has_all_codes("00110110", 2) is True


def test_has_all_codes_k_one():
    assert has_all_codes("0110", 1) is True


def test_has_all_codes_missing_code():
    assert has_all_codes("0110", 2) is False


def test_has_all_codes_string_too_short():
    assert has_all_codes("0", 2) is False


def test_has_all_codes_only_zeros():
    assert has_all_codes("0000", 1) is False


def test_has_all_codes_de_bruijn_sequence():
    assert has_all_codes("0001011100", 3) is True
