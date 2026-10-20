from solution import find_repeated_dna_sequences


def test_find_repeated_dna_sequences_example():
    result = find_repeated_dna_sequences("AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT")
    assert sorted(result) == ["AAAAACCCCC", "CCCCCAAAAA"]


def test_find_repeated_dna_sequences_overlapping_repeat_listed_once():
    assert find_repeated_dna_sequences("AAAAAAAAAAAAA") == ["AAAAAAAAAA"]


def test_find_repeated_dna_sequences_too_short():
    assert find_repeated_dna_sequences("ACGT") == []


def test_find_repeated_dna_sequences_exactly_ten():
    assert find_repeated_dna_sequences("AAAAAAAAAA") == []


def test_find_repeated_dna_sequences_eleven():
    assert find_repeated_dna_sequences("AAAAAAAAAAA") == ["AAAAAAAAAA"]


def test_find_repeated_dna_sequences_no_repeat():
    assert find_repeated_dna_sequences("ACGTACGTACGT") == []
