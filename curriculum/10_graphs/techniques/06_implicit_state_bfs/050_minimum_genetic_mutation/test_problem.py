from solution import min_mutation


def test_min_mutation_normal_case():
    assert min_mutation("AACCGGTT", "AACCGGTA", ["AACCGGTA"]) == 1


def test_min_mutation_multi_step():
    bank = ["AACCGGTA", "AACCGCTA", "AAACGGTA"]

    assert min_mutation("AACCGGTT", "AAACGGTA", bank) == 2


def test_min_mutation_no_valid_path():
    assert min_mutation("AACCGGTT", "AACCGGTA", []) == -1
