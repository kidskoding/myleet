from solution import find_repeated_dna_sequences


def test_find_repeated_dna_sequences_normal():
    s = "AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT"
    assert sorted(find_repeated_dna_sequences(s)) == sorted(["AAAAACCCCC", "CCCCCAAAAA"])


def test_find_repeated_dna_sequences_all_a():
    assert find_repeated_dna_sequences("AAAAAAAAAAAAA") == ["AAAAAAAAAA"]


def test_find_repeated_dna_sequences_none():
    assert find_repeated_dna_sequences("ACGTACGTAC") == []


def test_find_repeated_dna_sequences_short():
    assert find_repeated_dna_sequences("AAAAACCCCC") == []
