package interview

import (
	"math/rand"
	"testing"

	"github.com/kidskoding/myleet/internal/schedule"
	tu "github.com/kidskoding/myleet/internal/testutil"
)

func TestPickDistinctTechniquesDeterministic(t *testing.T) {
	c := tu.GoodCatalog(t)
	a := Pick(c, nil, nil, 3, tu.Day(19), rand.New(rand.NewSource(7)))
	b := Pick(c, nil, nil, 3, tu.Day(19), rand.New(rand.NewSource(7)))
	if len(a) != 3 {
		t.Fatalf("picked %d", len(a))
	}
	seen := map[string]bool{}
	for i := range a {
		if a[i] != b[i] {
			t.Fatal("not deterministic for one seed")
		}
		seen[a[i].Technique.Module.ID+"/"+a[i].Technique.ID] = true
	}
	if len(seen) != 3 {
		t.Fatalf("techniques not distinct: %v", seen)
	}
}

func TestPickPrefersWeak(t *testing.T) {
	c := tu.GoodCatalog(t)
	states := map[string]schedule.State{
		"p-one":   {Status: schedule.Learning, Rung: 0},
		"p-two":   {Status: schedule.Mastered, Rung: 3},
		"p-three": {Status: schedule.Mastered, Rung: 4},
		"two-sum": {Status: schedule.Mastered, Rung: 4},
	}
	attempts := []schedule.Attempt{{Problem: "p-one", Outcome: schedule.OutcomeFail, End: tu.Day(15)}}
	rng := rand.New(rand.NewSource(1))
	counts := map[string]int{}
	for i := 0; i < 1000; i++ {
		counts[Pick(c, states, attempts, 1, tu.Day(19), rng)[0].ID]++
	}
	if counts["p-one"] <= counts["p-two"]*3 {
		t.Fatalf("counts = %v", counts)
	}
}

func TestPickMoreThanAvailable(t *testing.T) {
	c := tu.GoodCatalog(t)
	if got := Pick(c, nil, nil, 10, tu.Day(19), rand.New(rand.NewSource(1))); len(got) != 4 {
		t.Fatalf("picked %d, want all 4", len(got))
	}
}

func TestPickSkipsBank(t *testing.T) {
	c := tu.GoodCatalog(t)
	for seed := int64(0); seed < 50; seed++ {
		for _, p := range Pick(c, nil, nil, 10, tu.Day(19), rand.New(rand.NewSource(seed))) {
			if p.Technique.Module.Bank {
				t.Fatal("interviews draw from the curriculum only")
			}
		}
	}
}

func TestPickCheckpointCoversModules(t *testing.T) {
	c := tu.GoodCatalog(t)
	n := CheckpointSize(c, 2)
	if n != 2 {
		t.Fatalf("size = %d", n)
	}
	got := PickCheckpoint(c, nil, 2, n, rand.New(rand.NewSource(3)))
	if len(got) != 2 {
		t.Fatalf("picked %d", len(got))
	}
	mods := map[int]bool{}
	for _, p := range got {
		if p.Technique.Module.Number > 2 || p.Technique.Module.Bank {
			t.Fatalf("out of slice: %s", p.ID)
		}
		mods[p.Technique.Module.Number] = true
	}
	if len(mods) != 2 {
		t.Fatalf("want one per module, got %v", mods)
	}
}

func TestPickCheckpointRespectsCeiling(t *testing.T) {
	c := tu.GoodCatalog(t)
	got := PickCheckpoint(c, nil, 1, 5, rand.New(rand.NewSource(1)))
	if len(got) == 0 {
		t.Fatal("empty")
	}
	for _, p := range got {
		if p.Technique.Module.Number > 1 {
			t.Fatalf("%s is past ceiling", p.ID)
		}
	}
}
