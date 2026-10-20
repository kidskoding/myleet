from solution import compressed_string


def test_compressed_string_all_distinct():
    assert compressed_string("abcde") == "1a1b1c1d1e"


def test_compressed_string_long_run_splits():
    assert compressed_string("aaaaaaaaaaaaaabb") == "9a5a2b"


def test_compressed_string_exactly_nine():
    assert compressed_string("a" * 9) == "9a"


def test_compressed_string_ten():
    assert compressed_string("a" * 10) == "9a1a"


def test_compressed_string_single():
    assert compressed_string("z") == "1z"


def test_compressed_string_eighteen():
    assert compressed_string("b" * 18 + "c") == "9b9b1c"
