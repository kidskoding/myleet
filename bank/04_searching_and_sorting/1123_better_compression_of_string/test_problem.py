from solution import better_compression


def test_better_compression_merges_repeated_letter():
    assert better_compression("a3c9b2c1") == "a3b2c10"


def test_better_compression_sorts_letters():
    assert better_compression("c2b3a1") == "a1b3c2"


def test_better_compression_already_best():
    assert better_compression("a2b4c1") == "a2b4c1"


def test_better_compression_single_piece():
    assert better_compression("z1") == "z1"


def test_better_compression_multi_digit_counts():
    assert better_compression("b12a3b1") == "a3b13"


def test_better_compression_large_counts():
    assert better_compression("a10000a9999") == "a19999"
