#git commit -m "testing ubunutu builds" -a
git push
git checkout release
git merge main
git commit -m "bump" -a
git push
git checkout main

